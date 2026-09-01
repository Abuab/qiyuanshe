'use strict'

const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(path.join(DATA_DIR, 'license.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    license_signature TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TEXT,
    machine_fingerprint TEXT,
    domain TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    last_heartbeat_at TEXT,
    heartbeat_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_signature ON licenses(license_signature);
  CREATE INDEX IF NOT EXISTS idx_status ON licenses(status);
`)

/** 允许手动更新的字段白名单，防止 SQL 注入 / 越权改字段 */
const UPDATABLE_FIELDS = ['customer_name', 'expires_at', 'machine_fingerprint', 'domain', 'status', 'revoked_at']

module.exports = {
  getBySignature(signature) {
    return db.prepare('SELECT * FROM licenses WHERE license_signature = ?').get(signature)
  },

  getById(id) {
    return db.prepare('SELECT * FROM licenses WHERE id = ?').get(id)
  },

  list() {
    return db.prepare('SELECT * FROM licenses ORDER BY id DESC').all()
  },

  create({ customerId, customerName, licenseSignature, expiresAt, machineFingerprint, domain }) {
    const info = db
      .prepare(
        `INSERT INTO licenses
          (customer_id, customer_name, license_signature, status, expires_at, machine_fingerprint, domain)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      )
      .run(customerId, customerName || null, licenseSignature, expiresAt || null, machineFingerprint || null, domain || null)
    return this.getById(info.lastInsertRowid)
  },

  update(id, fields) {
    const sets = []
    const values = []
    for (const key of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        sets.push(`${key} = ?`)
        values.push(fields[key])
      }
    }
    if (sets.length === 0) return this.getById(id)
    values.push(id)
    db.prepare(`UPDATE licenses SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(id)
  },

  markExpired(id) {
    db.prepare(`UPDATE licenses SET status = 'expired' WHERE id = ?`).run(id)
  },

  recordHeartbeat(id, { domain }) {
    const row = this.getById(id)
    if (!row) return
    // 首次心跳且尚未绑定域名时，记录部署域名（仅记录，不参与判定）
    const nextDomain = !row.domain && domain ? domain : row.domain
    db.prepare(
      `UPDATE licenses
         SET last_heartbeat_at = ?, heartbeat_count = heartbeat_count + 1, domain = ?
       WHERE id = ?`,
    ).run(new Date().toISOString(), nextDomain, id)
  },
}
