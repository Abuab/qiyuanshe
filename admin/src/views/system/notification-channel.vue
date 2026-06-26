<template>
  <div class="notification-channel-page">
    <!-- 顶部标题区 -->
    <div class="page-header">
      <h2 class="page-title">通知通道配置</h2>
    </div>

    <!-- 总开关卡片 -->
    <div class="master-switch-card">
      <div class="switch-content">
        <el-switch v-model="notificationEnabled" active-color="#409EFF" size="large" />
        <span class="switch-label">启用通知总开关</span>
        <span class="switch-desc">关闭后，所有通道均不会发送通知</span>
        <el-tag :type="notificationEnabled ? 'success' : 'danger'" size="small" effect="dark">
          {{ notificationEnabled ? '运行中' : '已停用' }}
        </el-tag>
      </div>
    </div>

    <!-- 通道配置卡片区 -->
    <div class="channel-cards-grid">
      <div
        v-for="ch in channels"
        :key="ch.key"
        class="channel-card"
      >
        <!-- 卡片头部：图标 + 名称 + 通道开关 -->
        <div class="card-header">
          <span class="channel-icon">
            <el-icon v-if="ch.key === 'wecom'" :size="32"><ChatLineSquare /></el-icon>
            <el-icon v-else-if="ch.key === 'feishu'" :size="32"><ChatDotRound /></el-icon>
            <el-icon v-else :size="32"><ChatRound /></el-icon>
          </span>
          <span class="channel-name">{{ ch.label }}</span>
          <el-switch
            v-model="ch.enabled"
            :disabled="!notificationEnabled"
            active-color="#409EFF"
            size="small"
            class="channel-switch"
          />
        </div>

        <!-- Webhook 地址输入 -->
        <div class="webhook-input-area">
          <label class="input-label">Webhook 地址</label>
          <el-input
            v-model="ch.webhookUrl"
            type="textarea"
            :rows="2"
            :placeholder="'请输入' + ch.label + '机器人 Webhook 地址'"
            :disabled="!notificationEnabled || !ch.enabled"
            @input="onWebhookInput(ch)"
          />
          <div class="status-line">
            <el-tag v-if="!ch.webhookUrl" type="info" size="small" effect="plain">未配置</el-tag>
            <el-tag v-else-if="ch.status === 'verified'" type="success" size="small">
              <el-icon style="margin-right:2px"><CircleCheck /></el-icon>已验证
            </el-tag>
            <el-tag v-else-if="ch.status === 'failed'" type="danger" size="small">
              连接失败
              <el-button link size="small" type="danger" style="margin-left:4px;padding:0" @click="testChannel(ch)">
                <el-icon><Refresh /></el-icon>重试
              </el-button>
            </el-tag>
            <el-tag v-else type="warning" size="small" effect="plain">待验证</el-tag>
          </div>
        </div>

        <!-- 测试连通性按钮 -->
        <div class="test-area">
          <el-button
            type="primary"
            size="small"
            :loading="ch.testing"
            :disabled="!ch.webhookUrl"
            @click="testChannel(ch)"
          >
            <el-icon><Position /></el-icon>测试连通性
          </el-button>
          <span v-if="ch.lastTestTime" class="last-test-time">
            上次测试：{{ ch.lastTestTime }}
          </span>
        </div>
      </div>
    </div>

    <!-- 通知类型配置卡片 -->
    <div class="notify-types-card">
      <div class="types-header">
        <span class="types-title">通知类型</span>
        <el-button-group>
          <el-button size="small" type="primary" plain @click="selectAllTypes">全选</el-button>
          <el-button size="small" type="info" plain @click="invertTypes">反选</el-button>
        </el-button-group>
      </div>

      <div
        v-for="nt in notifyTypes"
        :key="nt.key"
        class="type-item"
      >
        <el-checkbox v-model="nt.enabled" class="type-checkbox" />
        <span class="type-name">{{ nt.label }}</span>
        <span class="type-desc">{{ nt.desc }}</span>
        <span class="type-count" v-if="nt.todayCount > 0">{{ nt.todayCount }}次</span>
      </div>
    </div>

    <!-- 保存按钮区 -->
    <div class="save-footer">
      <el-button type="primary" size="medium" :loading="saving" @click="saveConfig">保存配置</el-button>
    </div>

    <!-- 未验证确认弹窗 -->
    <el-dialog v-model="confirmDialog.visible" title="确认保存" width="420px" center>
      <p style="color:#606266;font-size:14px;line-height:1.8">{{ confirmDialog.message }}</p>
      <template #footer>
        <el-button @click="confirmDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="doSave">确认保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatLineSquare, ChatDotRound, ChatRound, CircleCheck, Refresh, Position } from '@element-plus/icons-vue'
import { adminSystem, system } from '@/api/system'

// ===== 状态定义 =====

const notificationEnabled = ref(false)
const saving = ref(false)

interface ChannelConfig {
  key: string
  label: string
  webhookUrl: string
  enabled: boolean
  status: 'verified' | 'failed' | 'pending' | ''
  testing: boolean
  lastTestTime: string
}

const channels = reactive<ChannelConfig[]>([
  { key: 'wecom', label: '企业微信', webhookUrl: '', enabled: true, status: '', testing: false, lastTestTime: '' },
  { key: 'feishu', label: '飞书', webhookUrl: '', enabled: true, status: '', testing: false, lastTestTime: '' },
  { key: 'dingtalk', label: '钉钉', webhookUrl: '', enabled: true, status: '', testing: false, lastTestTime: '' },
])

interface NotifyTypeConfig {
  key: string
  label: string
  desc: string
  enabled: boolean
  todayCount: number
}

const notifyTypes = reactive<NotifyTypeConfig[]>([
  { key: 'photo', label: '图片审核', desc: '用户上传头像或照片时触发', enabled: true, todayCount: 0 },
  { key: 'avatar', label: '头像审核', desc: '用户上传头像时触发', enabled: true, todayCount: 0 },
  { key: 'voice', label: '语音审核', desc: '用户录制语音介绍时触发', enabled: true, todayCount: 0 },
  { key: 'user', label: '用户资料审核', desc: '用户修改昵称或个人简介时触发', enabled: true, todayCount: 0 },
  { key: 'chat', label: '聊天消息审核', desc: '用户发送聊天内容触发人工审核时触发', enabled: true, todayCount: 0 },
  { key: 'report', label: '举报通知', desc: '用户举报其他用户时触发', enabled: true, todayCount: 0 },
  { key: 'user_create', label: '用户创建', desc: '管理员后台创建新用户时触发', enabled: true, todayCount: 0 },
])

const confirmDialog = reactive({ visible: false, message: '' })

// ===== 总开关联动 =====

watch(notificationEnabled, (val) => {
  if (!val) {
    channels.forEach((ch) => { ch.enabled = false })
  }
})

// ===== Webhook 输入变化 → 状态重置为待验证 =====

function onWebhookInput(ch: ChannelConfig) {
  if (ch.status === 'verified' || ch.status === 'failed') {
    ch.status = ''
  }
}

// ===== 测试连通性 =====

async function testChannel(ch: ChannelConfig) {
  if (!ch.webhookUrl) return
  ch.testing = true
  try {
    const res = await adminSystem.testWebhook(ch.key, ch.webhookUrl)
    if (res && res.success) {
      ch.status = 'verified'
      ch.lastTestTime = formatNow()
      ElMessage.success('测试消息发送成功，请检查对应群/用户是否收到')
    } else {
      ch.status = 'failed'
      ElMessage.error(res?.message || '发送失败，请检查 Webhook 地址是否正确')
    }
  } catch (e: any) {
    ch.status = 'failed'
    ElMessage.error('发送失败，请检查 Webhook 地址是否正确')
  } finally {
    ch.testing = false
  }
}

function formatNow(): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ===== 通知类型全选/反选 =====

function selectAllTypes() {
  notifyTypes.forEach((nt) => { nt.enabled = true })
}

function invertTypes() {
  notifyTypes.forEach((nt) => { nt.enabled = !nt.enabled })
}

// ===== 表单校验 =====

function validate(): string | null {
  if (!notifyTypes.some((nt) => nt.enabled)) {
    return '请至少选择一个通知类型'
  }
  const enabledChannels = channels.filter((ch) => ch.enabled && ch.webhookUrl)
  for (const ch of enabledChannels) {
    if (ch.status !== 'verified') {
      return `${ch.label}通道尚未验证通过，请先点击"测试连通性"验证`
    }
  }
  return null
}

function getUnverifiedChannels(): ChannelConfig[] {
  return channels.filter((ch) => ch.enabled && ch.webhookUrl && ch.status !== 'verified')
}

// ===== 保存 =====

async function saveConfig() {
  // 校验：未验证的通道需确认
  const unverified = getUnverifiedChannels()
  if (unverified.length > 0 && unverified.some((ch) => ch.status !== 'verified')) {
    const names = unverified.map((c) => c.label).join('、')
    confirmDialog.message = `${names}通道尚未验证通过，确定保存吗？\n未验证的通道可能无法正常发送通知。`
    confirmDialog.visible = true
    return
  }

  const validationError = validate()
  if (validationError) {
    ElMessage.warning(validationError)
    return
  }

  await doSave()
}

async function doSave() {
  confirmDialog.visible = false
  saving.value = true
  try {
    // 构建 webhookUrls 对象
    const webhookUrls: Record<string, string> = {}
    channels.forEach((ch) => {
      webhookUrls[ch.key] = ch.webhookUrl
    })

    // 保存验证状态
    const channelsStatus: Record<string, string> = {}
    channels.forEach((ch) => {
      if (ch.webhookUrl && ch.status) channelsStatus[ch.key] = ch.status
    })

    const payload = {
      notify: {
        enabled: notificationEnabled.value,
        webhookUrls,
        channelsStatus,
        notifyTypes: notifyTypes.filter((nt) => nt.enabled).map((nt) => nt.key),
      },
    }
    const res = await adminSystem.saveConfigs(payload)
    if (res && res.success) {
      ElMessage.success('配置保存成功')
      await loadConfig()
    } else {
      ElMessage.error(res?.message || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// ===== 加载配置 =====

async function loadConfig() {
  try {
    const res = await system.getConfigs()
    if (res?.success && res.data?.notify) {
      const n = res.data.notify as any
      notificationEnabled.value = !!n.enabled

      // 通道配置
      if (n.webhookUrls) {
        channels.forEach((ch) => {
          const url = n.webhookUrls[ch.key]
          if (url) {
            ch.webhookUrl = url
            // 恢复上次保存的验证状态（如果有）
            ch.status = (n.channelsStatus && n.channelsStatus[ch.key]) || ''
          }
        })
      } else if (n.webhookUrl) {
        // 兼容旧格式
        channels[0].webhookUrl = n.webhookUrl
      }

      // 通道启用状态 — 从保存的数据中读取，或根据 webhookUrl 是否有值推断
      if (n.channels) {
        channels.forEach((ch) => {
          if (typeof n.channels[ch.key] === 'boolean') {
            ch.enabled = n.channels[ch.key]
          }
        })
      }

      // 通知类型
      if (Array.isArray(n.notifyTypes)) {
        const enabledSet = new Set(n.notifyTypes)
        notifyTypes.forEach((nt) => {
          nt.enabled = enabledSet.has(nt.key)
        })
      }
    }
  } catch {
    // 加载失败不影响页面
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.notification-channel-page {
  max-width: 1100px;
  padding: 0 0 24px;
}

.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 24px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

/* ===== 总开关卡片 ===== */
.master-switch-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}
.switch-content {
  display: flex;
  align-items: center;
  gap: 12px;
}
.switch-label {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-left: 0;
}
.switch-desc {
  font-size: 13px;
  color: #909399;
  margin-left: 12px;
  flex: 1;
}

/* ===== 通道卡片网格 ===== */
.channel-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 1366px) {
  .channel-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .channel-cards-grid {
    grid-template-columns: 1fr;
  }
}

.channel-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #ebeef5;
  transition: border-color 0.3s;
  display: flex;
  flex-direction: column;
}
.channel-card:hover {
  border-color: #409eff;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.channel-icon {
  color: #409eff;
  display: flex;
  align-items: center;
}
.channel-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-left: 12px;
  flex: 1;
}
.channel-switch {
  flex-shrink: 0;
}

/* ===== Webhook 输入区 ===== */
.webhook-input-area {
  margin-bottom: 16px;
}
.input-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  display: block;
}
.status-line {
  margin-top: 8px;
  min-height: 22px;
  display: flex;
  align-items: center;
}

/* ===== 测试区域 ===== */
.test-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.last-test-time {
  font-size: 12px;
  color: #909399;
}

/* ===== 通知类型卡片 ===== */
.notify-types-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}
.types-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.types-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.type-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  margin-bottom: 12px;
  transition: background 0.2s;
  gap: 12px;
}
.type-item:hover {
  background: #f5f7fa;
}
.type-item:last-child {
  margin-bottom: 0;
}
.type-checkbox {
  flex-shrink: 0;
}
.type-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
}
.type-desc {
  font-size: 12px;
  color: #909399;
  flex: 1;
}
.type-count {
  font-size: 12px;
  color: #409eff;
  font-weight: bold;
  flex-shrink: 0;
}

/* ===== 保存按钮区 ===== */
.save-footer {
  text-align: center;
  padding: 24px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  position: sticky;
  bottom: 0;
}
</style>
