<template>
  <div class="message-center-container">
    <h2 class="page-title">消息群发</h2>

    <el-tabs v-model="activeTab">
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

            <!-- 消息模板（增强：右侧「管理模板」链接 + 手动修改提示） -->
            <el-form-item label="消息模板">
              <div class="template-select-row">
                <el-select
                  v-model="selectedTemplateId"
                  placeholder="选择模板（可选）"
                  clearable
                  style="flex: 1"
                  @change="onTemplateSelect"
                >
                  <el-option
                    v-for="tpl in templateList"
                    :key="tpl.id"
                    :label="`[${selectCategoryLabel(tpl.category)}] ${tpl.name}`"
                    :value="tpl.id"
                  />
                </el-select>
                <el-button link type="primary" @click="goToTemplates">管理模板</el-button>
              </div>
              <div v-if="selectedTemplateId && templateEdited" class="template-edit-tip">
                已基于模板修改，发送时将使用当前编辑内容
              </div>
            </el-form-item>

            <el-form-item label="消息标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入消息标题"
                maxlength="50"
                show-word-limit
                @input="onManualEdit"
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
                @input="onManualEdit"
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
            <el-table-column label="发送范围" min-width="200">
              <template #default="{ row }">
                <!-- 全部用户 -->
                <el-popover
                  v-if="!row.targetUserIds"
                  trigger="hover"
                  placement="top"
                  :width="200"
                >
                  <template #reference>
                    <el-tag type="primary" size="small" class="scope-tag">全部用户</el-tag>
                  </template>
                  <div class="scope-popover-text">发送给全部活跃用户</div>
                </el-popover>

                <!-- 指定用户 -->
                <template v-else>
                  <el-popover
                    trigger="hover"
                    placement="top"
                    :width="220"
                  >
                    <template #reference>
                      <el-tag
                        type="success"
                        size="small"
                        class="scope-tag scope-tag-clickable"
                        @click="openReceiverDialog(row)"
                      >
                        指定用户 ({{ receiverCount(row) }}人)
                      </el-tag>
                    </template>
                    <div class="user-popover-list">
                      <template v-if="row.targetUsers && row.targetUsers.length">
                        <div
                          v-for="u in (row.targetUsers.length > 5 ? row.targetUsers.slice(0, 5) : row.targetUsers)"
                          :key="u.id"
                          class="user-popover-item"
                        >
                          ID:{{ u.userId || u.id }} {{ u.nickname }}
                        </div>
                        <div v-if="row.targetUsers.length > 5" class="user-popover-more">
                          等 {{ row.targetUsers.length - 5 }} 人
                        </div>
                      </template>
                      <div v-else class="user-popover-empty">指定用户，暂无详情</div>
                    </div>
                    <div class="user-popover-footer">点击查看完整接收人列表</div>
                  </el-popover>
                </template>
              </template>
            </el-table-column>
            <!-- 增强：使用模板列 -->
            <el-table-column label="使用模板" width="120">
              <template #default="{ row }">
                {{ row.templateName || row.template?.name || '-' }}
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

        <!-- 接收用户列表弹窗 -->
        <el-dialog
          v-model="receiverDialogVisible"
          width="500px"
          :close-on-click-modal="false"
        >
          <template #header>
            <span>接收用户列表（共 {{ receiverList.length }} 人）</span>
          </template>
          <el-input
            v-model="receiverKeyword"
            placeholder="搜索昵称/ID"
            clearable
            style="margin-bottom: 12px;"
            @input="onReceiverSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-table v-if="filteredReceiverList.length > 0" :data="pagedReceiverList">
            <el-table-column label="用户" min-width="200">
              <template #default="{ row }">
                <div class="receiver-user-cell">
                  <el-avatar :size="32" :src="row.avatar" />
                  <span>{{ row.nickname }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用户ID" width="120">
              <template #default="{ row }">ID:{{ row.userId || row.id }}</template>
            </el-table-column>
          </el-table>
          <div v-else class="receiver-empty">暂无接收用户详情</div>
          <div class="receiver-pagination" v-if="filteredReceiverList.length > receiverPageSize">
            <el-pagination
              v-model:current-page="receiverPage"
              :page-size="receiverPageSize"
              :total="filteredReceiverList.length"
              layout="prev, pager, next"
              small
            />
          </div>
        </el-dialog>
      </el-tab-pane>

      <!-- ======================== 消息模板 ======================== -->
      <el-tab-pane label="消息模板" name="templates">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">消息模板</span>
              <el-button type="primary" @click="handleCreate">
                <el-icon><Plus /></el-icon>
                添加模板
              </el-button>
            </div>
          </template>

          <el-alert type="info" :closable="false" class="tpl-tip">
            以下模板仅用于群发消息场景，可在发送消息时一键选用。
          </el-alert>

          <!-- 筛选栏 -->
          <div class="filter-bar">
            <el-form :inline="true" :model="tplFilterForm" class="filter-form">
              <el-form-item label="分类">
                <el-select v-model="tplFilterForm.category" placeholder="全部" clearable style="width: 140px" @change="handleSearch">
                  <el-option label="全部" value="" />
                  <el-option label="系统通知" value="notification" />
                  <el-option label="欢迎消息" value="greeting" />
                  <el-option label="提醒" value="reminder" />
                  <el-option label="营销" value="marketing" />
                </el-select>
              </el-form-item>
              <el-form-item label="关键词">
                <el-input
                  v-model="tplFilterForm.keyword"
                  placeholder="模板名称/内容"
                  clearable
                  style="width: 200px"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleSearch">搜索</el-button>
                <el-button @click="handleResetFilter">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table :data="tplTableData" v-loading="tplLoading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="模板名称" min-width="160" />
            <el-table-column prop="category" label="分类" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="categoryType(row.category)">
                  {{ categoryLabel(row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="useCount" label="使用次数" width="100" align="center" sortable="custom">
              <template #header>
                <el-tooltip content="统计收到该模板消息的总人数" placement="top">
                  <span>使用次数 <el-icon style="font-size:12px;vertical-align:middle"><QuestionFilled /></el-icon></span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="lastUsedAt" label="最近使用" width="160" sortable="custom">
              <template #default="{ row }">
                {{ row.lastUsedAt ? formatTime(row.lastUsedAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="useTemplateForSend(row)">使用发送</el-button>
                <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
                <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper" v-if="tplTotal > tplFilterForm.limit">
            <el-pagination
              v-model:current-page="tplFilterForm.page"
              :page-size="tplFilterForm.limit"
              :total="tplTotal"
              layout="total, prev, pager, next"
              @current-change="fetchTemplates"
            />
          </div>
        </el-card>

        <!-- 编辑/添加模板弹窗 -->
        <el-dialog
          v-model="tplDialogVisible"
          :title="tplIsEdit ? '编辑模板' : '添加模板'"
          width="640px"
          :close-on-click-modal="false"
        >
          <el-form ref="tplFormRef" :model="tplForm" :rules="tplRules" label-width="100px">
            <el-form-item label="模板名称" prop="name">
              <el-input v-model="tplForm.name" placeholder="运营后台显示名称" maxlength="50" />
            </el-form-item>
            <el-form-item label="分类" prop="category">
              <el-select v-model="tplForm.category" style="width: 200px">
                <el-option label="系统通知" value="notification" />
                <el-option label="欢迎消息" value="greeting" />
                <el-option label="提醒" value="reminder" />
                <el-option label="营销" value="marketing" />
              </el-select>
            </el-form-item>
            <el-form-item label="消息标题" prop="title">
              <el-input
                v-model="tplForm.title"
                placeholder="消息标题，支持占位符 {nickname}"
                maxlength="100"
              />
            </el-form-item>
            <el-form-item label="消息内容" prop="content">
              <el-input
                v-model="tplForm.content"
                type="textarea"
                :rows="5"
                placeholder="消息内容，支持占位符：{nickname}、{referral} 等"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="tplForm.sortOrder" :min="0" :max="999" />
            </el-form-item>
            <el-form-item label="占位符说明">
              <div class="placeholder-list">
                <div
                  v-for="(ph, idx) in tplForm.placeholders || []"
                  :key="idx"
                  class="placeholder-item"
                >
                  <el-input
                    v-model="ph.key"
                    placeholder="变量名"
                    style="width: 120px"
                  />
                  <el-input
                    v-model="ph.label"
                    placeholder="说明"
                    style="width: 160px"
                  />
                  <el-input
                    v-model="ph.example"
                    placeholder="示例值"
                    style="width: 120px"
                  />
                  <el-button
                    size="small"
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="removePlaceholder(idx)"
                  />
                </div>
                <el-button size="small" type="primary" plain @click="addPlaceholder">
                  <el-icon><Plus /></el-icon>
                  添加占位符
                </el-button>
              </div>
              <div class="form-tip">定义模板中可用的占位符，方便运营人员了解模板功能</div>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="tplDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="tplSaving" @click="handleSave">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import { Search, ArrowRight, Close, Plus, Delete, QuestionFilled } from '@element-plus/icons-vue'
import request from '../../api/request'
import { adminUsers } from '../../api/user'
import { messageTemplateApi, type MessageTemplate } from '../../api/message-template'

interface SendForm {
  title: string
  content: string
}

const activeTab = ref('send')
// 增强 B：是否已基于模板手动修改标题/内容
const templateEdited = ref(false)

// ===== 发送消息 =====
const formRef = ref<FormInstance>()
const sending = ref(false)
const resultVisible = ref(false)
const resultSuccess = ref(false)
const resultMsg = ref('')
const sendMode = ref('all')
const selectedTemplateId = ref<number | undefined>(undefined)
const templateList = ref<any[]>([])

const form = reactive<SendForm>({
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
    if (selectedTemplateId.value) {
      payload.templateId = selectedTemplateId.value
    }

    const res: any = await request({
      url: '/admin/user-profiles/notifications/broadcast',
      method: 'POST',
      data: payload,
    })
    resultSuccess.value = true
    resultMsg.value = res?.message || '消息已成功发送'
    handleReset()
    sendMode.value = 'all'
    rightList.value = []
    // 自动刷新发送日志（重置到第一页确保最新记录可见）
    logPage.value = 1
    loadLogs()
    loadedTabs.logs = true
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
  selectedTemplateId.value = undefined
  templateEdited.value = false
  formRef.value?.resetFields()
}

// ===== 模板选择（发送消息） =====
function selectCategoryLabel(cat: string) {
  const map: Record<string, string> = { notification: '系统', greeting: '欢迎', reminder: '提醒', marketing: '营销' }
  return map[cat] || cat
}

async function loadTemplates() {
  try {
    const res = await messageTemplateApi.getSelectable()
    templateList.value = (res as any)?.data || res || []
  } catch { /* 加载失败不影响页面使用 */ }
}

function onTemplateSelect(templateId: number | undefined) {
  templateEdited.value = false
  if (!templateId) return
  const tpl = templateList.value.find(t => t.id === templateId)
  if (tpl) {
    form.title = tpl.title || ''
    form.content = tpl.content || ''
  }
}

// 增强 B：手动编辑标题/内容时标记
function onManualEdit() {
  if (selectedTemplateId.value) {
    templateEdited.value = true
  }
}

// 增强 A：切换到消息模板 Tab
function goToTemplates() {
  activeTab.value = 'templates'
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

// ===== 接收用户列表（发送日志弹窗） =====
const receiverDialogVisible = ref(false)
const receiverList = ref<any[]>([])
const receiverKeyword = ref('')
const receiverPage = ref(1)
const receiverPageSize = 10

function receiverCount(row: any): number {
  return row.targetUserIds?.length || row.totalSent || 0
}

function openReceiverDialog(row: any) {
  receiverList.value = row.targetUsers || []
  receiverKeyword.value = ''
  receiverPage.value = 1
  receiverDialogVisible.value = true
}

function onReceiverSearch() {
  receiverPage.value = 1
}

const filteredReceiverList = computed(() => {
  const kw = receiverKeyword.value.trim().toLowerCase()
  if (!kw) return receiverList.value
  return receiverList.value.filter((u: any) => {
    const idStr = String(u.userId ?? u.id ?? '')
    const nick = String(u.nickname ?? '').toLowerCase()
    return idStr.includes(kw) || nick.includes(kw)
  })
})

const pagedReceiverList = computed(() => {
  const start = (receiverPage.value - 1) * receiverPageSize
  return filteredReceiverList.value.slice(start, start + receiverPageSize)
})

// ===== 消息模板 =====
const tplLoading = ref(false)
const tplSaving = ref(false)
const tplDialogVisible = ref(false)
const tplIsEdit = ref(false)
const tplEditId = ref<number>(0)
const tplFormRef = ref()
const tplTableData = ref<MessageTemplate[]>([])
const tplTotal = ref(0)

const tplFilterForm = reactive({
  page: 1,
  limit: 20,
  category: '',
  keyword: '',
})

const tplForm = reactive({
  name: '',
  title: '',
  content: '',
  category: 'notification',
  placeholders: [] as { key: string; label: string; example: string }[],
  sortOrder: 0,
})

const tplRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  title: [{ required: true, message: '请输入消息标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入消息内容', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = { notification: '系统通知', greeting: '欢迎', reminder: '提醒', marketing: '营销' }
  return map[cat] || cat
}

function categoryType(cat: string): string {
  const map: Record<string, string> = { notification: '', greeting: 'success', reminder: 'warning', marketing: 'danger' }
  return map[cat] || ''
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function addPlaceholder() {
  tplForm.placeholders.push({ key: '', label: '', example: '' })
}

function removePlaceholder(idx: number) {
  tplForm.placeholders.splice(idx, 1)
}

async function fetchTemplates() {
  tplLoading.value = true
  try {
    const res = await messageTemplateApi.list({
      page: tplFilterForm.page,
      limit: tplFilterForm.limit,
      category: tplFilterForm.category || undefined,
      keyword: tplFilterForm.keyword || undefined,
    })
    if (res.success && res.data) {
      tplTableData.value = res.data.list
      tplTotal.value = res.data.total
    }
  } catch {
    // ignore
  } finally {
    tplLoading.value = false
  }
}

function handleSearch() {
  tplFilterForm.page = 1
  fetchTemplates()
}

function handleResetFilter() {
  tplFilterForm.category = ''
  tplFilterForm.keyword = ''
  tplFilterForm.page = 1
  fetchTemplates()
}

function handleCreate() {
  tplIsEdit.value = false
  tplEditId.value = 0
  tplForm.name = ''
  tplForm.title = ''
  tplForm.content = ''
  tplForm.category = 'notification'
  tplForm.placeholders = []
  tplForm.sortOrder = 0
  tplDialogVisible.value = true
}

function handleEdit(row: MessageTemplate) {
  tplIsEdit.value = true
  tplEditId.value = row.id
  tplForm.name = row.name
  tplForm.title = row.title
  tplForm.content = row.content
  tplForm.category = row.category
  tplForm.placeholders = row.placeholders ? [...row.placeholders] : []
  tplForm.sortOrder = row.sortOrder || 0
  tplDialogVisible.value = true
}

async function handleSave() {
  try {
    await tplFormRef.value.validate()
  } catch {
    return
  }
  tplSaving.value = true
  try {
    const data = { ...tplForm, placeholders: tplForm.placeholders.filter(p => p.key) }
    if (tplIsEdit.value) {
      await messageTemplateApi.update(tplEditId.value, data)
      ElMessage.success('模板更新成功')
    } else {
      await messageTemplateApi.create(data)
      ElMessage.success('模板创建成功')
    }
    tplDialogVisible.value = false
    fetchTemplates()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    tplSaving.value = false
  }
}

async function handleDelete(row: MessageTemplate) {
  try {
    await ElMessageBox.confirm(`确定要删除模板「${row.name}」吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await messageTemplateApi.remove(row.id)
    ElMessage.success('删除成功')
    fetchTemplates()
  } catch {
    // cancelled or error
  }
}

// 增强 C：从消息模板 Tab 一键使用发送
function useTemplateForSend(row: MessageTemplate) {
  form.title = row.title
  form.content = row.content
  selectedTemplateId.value = row.id
  templateEdited.value = false
  activeTab.value = 'send'
}

// ===== 首次进入 Tab 时加载数据 =====
const loadedTabs = reactive({ logs: false, templates: false })

watch(activeTab, (tab) => {
  if (tab === 'logs' && !loadedTabs.logs) {
    loadedTabs.logs = true
    loadLogs()
  } else if (tab === 'templates' && !loadedTabs.templates) {
    loadedTabs.templates = true
    fetchTemplates()
  }
})

onMounted(() => {
  // 发送消息 Tab 默认激活，先加载模板选择器
  loadTemplates()
})
</script>

<style lang="scss" scoped>
.message-center-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.broadcast-form {
  margin-top: 10px;
}

.template-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.template-edit-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
  line-height: 1.5;
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

// 发送日志 - 发送范围标签与 popover
.scope-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.scope-tag-clickable {
  cursor: pointer;
}

.scope-popover-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.user-popover-list {
  max-height: 200px;
  overflow-y: auto;
}

.user-popover-item {
  padding: 4px 0;
  font-size: 13px;
  color: #606266;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.user-popover-more {
  padding: 4px 0;
  font-size: 12px;
  color: #909399;
}

.user-popover-empty {
  padding: 4px 0;
  font-size: 13px;
  color: #909399;
}

.user-popover-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}

// 接收用户列表弹窗
.receiver-user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.receiver-empty {
  padding: 40px 0;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.receiver-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

// 消息模板
.tpl-tip {
  margin-bottom: 16px;
}

.filter-bar {
  margin-bottom: 16px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.placeholder-list {
  .placeholder-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
