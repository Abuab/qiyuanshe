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
    domain TEXT,
    max_activations INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    last_heartbeat_at TEXT,
    heartbeat_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_signature ON licenses(license_signature);
  CREATE INDEX IF NOT EXISTS idx_status ON licenses(status);

  CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL,
    domain TEXT,
    ip TEXT,
    activated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_heartbeat_at TEXT,
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE INDEX IF NOT EXISTS idx_activations_license ON activations(license_id);
`)

/** 兼容旧库：老版本 licenses 表缺少 max_activations 列时补加 */
function hasColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  return cols.some((c) => c.name === column)
}
if (!hasColumn('licenses', 'max_activations')) {
  db.exec('ALTER TABLE licenses ADD COLUMN max_activations INTEGER NOT NULL DEFAULT 1')
}
// 旧方案「机器指纹强绑定」已取消：删除 licenses 表中的 machine_fingerprint 列
if (hasColumn('licenses', 'machine_fingerprint')) {
  db.exec('ALTER TABLE licenses DROP COLUMN machine_fingerprint')
}

/** 允许手动更新的字段白名单，防止 SQL 注入 / 越权改字段 */
const UPDATABLE_FIELDS = [
  'customer_name',
  'license_signature',
  'expires_at',
  'domain',
  'max_activations',
  'status',
  'revoked_at',
]

module.exports = {
  // ===== licenses =====
  getBySignature(signature) {
    return db.prepare('SELECT * FROM licenses WHERE license_signature = ?').get(signature)
  },

  getByCustomerId(customerId) {
    return db.prepare('SELECT * FROM licenses WHERE customer_id = ?').get(customerId)
  },

  getById(id) {
    return db.prepare('SELECT * FROM licenses WHERE id = ?').get(id)
  },

  list() {
    return db.prepare('SELECT * FROM licenses ORDER BY id DESC').all()
  },

  create({ customerId, customerName, licenseSignature, expiresAt, domain, maxActivations }) {
    const info = db
      .prepare(
        `INSERT INTO licenses
          (customer_id, customer_name, license_signature, status, expires_at, domain, max_activations)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      )
      .run(
        customerId,
        customerName || null,
        licenseSignature,
        expiresAt || null,
        domain || null,
        maxActivations && Number.isInteger(maxActivations) && maxActivations > 0 ? maxActivations : 1,
      )
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
    const nextDomain = !row.domain && domain ? domain : row.domain
    db.prepare(
      `UPDATE licenses
         SET last_heartbeat_at = ?, heartbeat_count = heartbeat_count + 1, domain = ?
       WHERE id = ?`,
    ).run(new Date().toISOString(), nextDomain, id)
  },

  // ===== activations =====
  countActivations(licenseId) {
    const row = db
      .prepare(`SELECT COUNT(*) AS cnt FROM activations WHERE license_id = ? AND status = 'active'`)
      .get(licenseId)
    return row ? row.cnt : 0
  },

  getActivationById(id) {
    return db.prepare('SELECT * FROM activations WHERE id = ?').get(id)
  },

  listActivations(licenseId) {
    return db
      .prepare('SELECT * FROM activations WHERE license_id = ? ORDER BY id ASC')
      .all(licenseId)
  },

  createActivation({ licenseId, domain, ip }) {
    const info = db
      .prepare(
        `INSERT INTO activations
          (license_id, domain, ip, activated_at, last_heartbeat_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(licenseId, domain || null, ip || null, new Date().toISOString(), new Date().toISOString())
    return this.getActivationById(info.lastInsertRowid)
  },

  touchActivation(id, { domain, ip }) {
    db.prepare(
      `UPDATE activations
         SET last_heartbeat_at = ?, domain = COALESCE(?, domain), ip = COALESCE(?, ip)
       WHERE id = ?`,
    ).run(new Date().toISOString(), domain || null, ip || null, id)
  },

  deleteActivation(licenseId, activationId) {
    const info = db
      .prepare('DELETE FROM activations WHERE license_id = ? AND id = ?')
      .run(licenseId, activationId)
    return info.changes > 0
  },
}
