<template>
  <div class="broadcast-container">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- ======================== 发送消息 ======================== -->
      <el-tab-pane label="发送消息" name="send">
        <el-card class="broadcast-card" shadow="never">
          <template #header>
            <span class="card-title">群发系统消息</span>
          </template>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="80px"
            class="broadcast-form"
          >
            <!-- 用户范围 -->
            <el-form-item label="发送范围">
              <el-radio-group v-model="sendMode" @change="onSendModeChange">
                <el-radio value="all">全部用户</el-radio>
                <el-radio value="selected">指定用户</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="消息标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入消息标题"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="消息内容" prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="4"
                placeholder="请输入消息内容"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-form>

          <el-alert
            title="提示"
            type="info"
            :closable="false"
            show-icon
            class="broadcast-tip"
          >
            <template #default>
              <p>群发后，{{ sendMode === 'all' ? '所有活跃用户' : '指定用户' }}将在小程序「消息 → 系统消息」页收到此通知。</p>
              <p>请谨慎操作，消息发送后无法撤回。</p>
            </template>
          </el-alert>

          <!-- 指定用户选择 -->
          <div v-if="sendMode === 'selected'" class="transfer-section">
            <div class="transfer-container">
              <!-- 左侧：所有用户 -->
              <div class="transfer-panel">
                <div class="panel-header">
                  <span class="panel-title">所有用户</span>
                  <span class="panel-count">共 {{ leftTotal }} 人</span>
                </div>
                <div class="panel-search">
                  <el-input
                    v-model="searchKeyword"
                    placeholder="搜索昵称/ID"
                    clearable
                    size="small"
                    @input="onSearch"
                    @clear="onSearchClear"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                </div>
                <div class="panel-list" v-loading="loadingLeft">
                  <div
                    v-for="item in leftList"
                    :key="item.id"
                    class="transfer-item"
                    :class="{ selected: selectedLeftIds.has(item.id) }"
                    @click="toggleLeftSelect(item.id)"
                  >
                    <el-checkbox
                      :model-value="selectedLeftIds.has(item.id)"
                      @click.stop
                      @change="toggleLeftSelect(item.id)"
                    />
                    <el-avatar :src="item.avatar" :size="36" />
                    <div class="item-info">
                      <div class="item-name-row">
                        <span class="item-name">{{ item.nickname }}</span>
                        <el-tag v-if="item.status === 4" type="danger" size="small" class="locked-tag">已锁定</el-tag>
                      </div>
                      <span class="item-meta">ID:{{ item.userId || item.id }} · {{ genderLabel(item.gender) }} · {{ item.age }}岁</span>
                    </div>
                  </div>
                  <div v-if="leftList.length === 0 && !loadingLeft" class="empty-tip">暂无用户</div>
                </div>
                <div class="panel-footer" v-if="leftTotal > leftPageSize">
                  <el-pagination
                    v-model:current-page="leftPage"
                    :page-size="leftPageSize"
                    :total="leftTotal"
                    layout="prev, pager, next"
                    small
                    @current-change="loadLeftUsers"
                  />
                </div>
              </div>

              <!-- 中间操作 -->
              <div class="transfer-actions">
                <el-button
                  :disabled="selectedLeftIds.size === 0"
                  type="primary"
                  :icon="ArrowRight"
                  circle
                  size="small"
                  @click="addToRight"
                />
              </div>

              <!-- 右侧：已选用户 -->
              <div class="transfer-panel">
                <div class="panel-header">
                  <span class="panel-title">已选用户</span>
                  <span class="panel-count">共 {{ rightList.length }} 人</span>
                  <el-button
                    v-if="rightList.length > 0"
                    type="danger"
                    size="small"
                    text
                    style="margin-left: auto;"
                    @click="clearRight"
                  >
                    清空
                  </el-button>
                </div>
                <div class="panel-list">
                  <div
                    v-for="item in rightList"
                    :key="item.id"
                    class="transfer-item right-item"
                  >
                    <el-avatar :src="item.avatar" :size="32" />
                    <div class="item-info">
                      <div class="item-name-row">
                        <span class="item-name">{{ item.nickname }}</span>
                        <el-tag v-if="item.status === 4" type="danger" size="small" class="locked-tag">已锁定</el-tag>
                      </div>
                      <span class="item-meta">ID:{{ item.userId || item.id }}</span>
                    </div>
                    <el-button
                      type="danger"
                      :icon="Close"
                      circle
                      size="small"
                      text
                      @click="removeFromRight(item.id)"
                    />
                  </div>
                  <div v-if="rightList.length === 0" class="empty-tip">请从左侧选择用户</div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <el-button
              type="primary"
              :loading="sending"
              :disabled="sendMode === 'selected' && rightList.length === 0"
              @click="handleSend"
            >
              {{ sending ? '发送中...' : '确认发送' }}
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
        </el-card>

        <!-- 发送结果弹窗 -->
        <el-dialog
          v-model="resultVisible"
          title="发送结果"
          width="400px"
          :close-on-click-modal="false"
        >
          <div class="result-content">
            <el-result
              :icon="resultSuccess ? 'success' : 'error'"
              :title="resultSuccess ? '发送成功' : '发送失败'"
              :sub-title="resultMsg"
            />
          </div>
          <template #footer>
            <el-button type="primary" @click="resultVisible = false">确定</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ======================== 发送日志 ======================== -->
      <el-tab-pane label="发送日志" name="logs">
        <el-card shadow="never">
          <el-table :data="logList" v-loading="loadingLogs" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="title" label="消息标题" min-width="150" show-overflow-tooltip />
            <el-table-column prop="content" label="消息内容" min-width="200" show-overflow-tooltip />
            <el-table-column label="发送范围" width="110">
              <template #default="{ row }">
                <el-tag v-if="!row.targetUserIds" type="primary" size="small">全部用户</el-tag>
                <el-tag v-else size="small">{{ row.targetUserIds.length }} 位用户</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalSent" label="实际发送" width="80" />
            <el-table-column prop="createdAt" label="发送时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 16px; text-align: right;" v-if="logTotal > logPageSize">
            <el-pagination
              v-model:current-page="logPage"
              :page-size="logPageSize"
              :total="logTotal"
              layout="prev, pager, next"
              small
              @current-change="loadLogs"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import { Search, ArrowRight, Close } from '@element-plus/icons-vue'
import request from '../../api/request'
import { adminUsers } from '../../api/user'

interface FormData {
  title: string
  content: string
}

const activeTab = ref('send')
const formRef = ref<FormInstance>()
const sending = ref(false)
const resultVisible = ref(false)
const resultSuccess = ref(false)
const resultMsg = ref('')
const sendMode = ref('all')

const form = reactive<FormData>({
  title: '',
  content: '',
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入消息标题', trigger: 'blur' },
    { max: 50, message: '标题最多50个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入消息内容', trigger: 'blur' },
    { max: 500, message: '内容最多500个字符', trigger: 'blur' },
  ],
}

// ===== 用户选择（transfer panel） =====
const searchKeyword = ref('')
const leftPage = ref(1)
const leftPageSize = 20
const leftTotal = ref(0)
const leftList = ref<any[]>([])
const rightList = ref<any[]>([])
const loadingLeft = ref(false)
const selectedLeftIds = ref(new Set<number>())

let searchTimer: ReturnType<typeof setTimeout> | null = null

function genderLabel(g: number) {
  return g === 1 ? '男' : g === 2 ? '女' : '未知'
}

async function loadLeftUsers() {
  loadingLeft.value = true
  try {
    const res: any = await adminUsers.list({
      page: leftPage.value,
      limit: leftPageSize,
      keyword: searchKeyword.value || undefined,
    })
    const data = res?.data || res
    leftList.value = data?.list || []
    leftTotal.value = data?.total || 0
    selectedLeftIds.value.clear()
  } catch {
    ElMessage.error('加载用户列表失败')
  } finally {
    loadingLeft.value = false
  }
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    leftPage.value = 1
    loadLeftUsers()
  }, 300)
}

function onSearchClear() {
  searchKeyword.value = ''
  leftPage.value = 1
  loadLeftUsers()
}

function toggleLeftSelect(id: number) {
  const s = new Set(selectedLeftIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedLeftIds.value = s
}

function addToRight() {
  const toAdd = leftList.value.filter(item => selectedLeftIds.value.has(item.id))
  const existingIds = new Set(rightList.value.map(item => item.id))
  rightList.value.push(...toAdd.filter(item => !existingIds.has(item.id)))
  selectedLeftIds.value.clear()
}

function removeFromRight(id: number) {
  rightList.value = rightList.value.filter(item => item.id !== id)
}

function clearRight() {
  rightList.value = []
}

function onSendModeChange() {
  if (sendMode.value === 'all') {
    rightList.value = []
    selectedLeftIds.value.clear()
  } else if (rightList.value.length === 0) {
    loadLeftUsers()
  }
}

// ===== 发送逻辑 =====
async function handleSend() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  let confirmMsg = '确认向全部用户发送此消息？此操作不可撤回。'
  if (sendMode.value === 'selected') {
    confirmMsg = `确认向已选的 ${rightList.value.length} 位用户发送此消息？此操作不可撤回。`
  }

  try {
    await ElMessageBox.confirm(confirmMsg, '二次确认', {
      confirmButtonText: '确认发送',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  sending.value = true
  try {
    const payload: any = {
      title: form.title,
      content: form.content,
    }
    if (sendMode.value === 'selected' && rightList.value.length > 0) {
      payload.targetUserIds = rightList.value.map(u => u.id)
    }

    const res: any = await request({
      url: '/admin/user-profiles/notifications/broadcast',
      method: 'POST',
      data: payload,
    })
    resultSuccess.value = true
    resultMsg.value = res?.message || '消息已成功发送'
    // 发送成功后重置
    handleReset()
    sendMode.value = 'all'
    rightList.value = []
  } catch (e: any) {
    resultSuccess.value = false
    resultMsg.value = e?.message || '发送失败，请稍后重试'
  } finally {
    sending.value = false
    resultVisible.value = true
  }
}

function handleReset() {
  form.title = ''
  form.content = ''
  formRef.value?.resetFields()
}

// ===== 发送日志 =====
const logList = ref<any[]>([])
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = 20
const loadingLogs = ref(false)

async function loadLogs() {
  loadingLogs.value = true
  try {
    const res: any = await request({
      url: '/admin/user-profiles/notifications/broadcast/logs',
      method: 'GET',
      params: { page: logPage.value, limit: logPageSize },
    })
    const data = res?.data || res
    logList.value = data?.list || []
    logTotal.value = data?.total || 0
  } catch {
    ElMessage.error('加载日志失败')
  } finally {
    loadingLogs.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => {
  loadLogs()
})
</script>

<style lang="scss" scoped>
.broadcast-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.broadcast-card {
  .card-title {
    font-size: 18px;
    font-weight: 600;
  }
}

.broadcast-form {
  margin-top: 10px;
}

.broadcast-tip {
  margin-bottom: 18px;
  p {
    margin: 0;
    line-height: 1.8;
  }
}

.form-actions {
  margin-top: 20px;
}

.result-content {
  text-align: center;
}

// ===== 用户选择 Transfer Panel =====
.transfer-section {
  margin-top: 16px;
  margin-bottom: 20px;
}

.transfer-container {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 360px;
}

.transfer-panel {
  flex: 1;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: 440px;
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
  border-radius: 6px 6px 0 0;
  gap: 8px;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.panel-count {
  font-size: 12px;
  color: #999;
}

.panel-search {
  padding: 8px 10px;
  border-bottom: 1px solid #ebeef5;
}

.panel-list {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.panel-footer {
  padding: 8px;
  border-top: 1px solid #ebeef5;
  text-align: center;
}

.transfer-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  gap: 10px;
  border-bottom: 1px solid #f5f5f5;

  &:hover {
    background: #f5f7fa;
  }

  &.selected {
    background: #ecf5ff;
  }
}

.right-item {
  cursor: default;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
}

.item-meta {
  font-size: 12px;
  color: #999;
  display: block;
  margin-top: 2px;
}

.locked-tag {
  font-size: 11px;
  padding: 0 4px;
}

.transfer-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-top: 60px;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #ccc;
  font-size: 13px;
}
</style>
