<template>
  <div class="store-cert-page">
    <div class="page-header">
      <h3>到店认证管理</h3>
      <p class="subtitle">将用户添加到「已认证」列表，该用户在小程序中将显示已认证状态</p>
    </div>

    <div class="transfer-container">
      <!-- 左侧：所有用户 -->
      <div class="panel left-panel">
        <div class="panel-header">
          <span>所有用户</span>
        </div>
        <div class="search-box">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索昵称或手机号"
            clearable
            @input="handleSearch"
            size="small"
          />
        </div>
        <div class="panel-list" v-loading="loadingLeft">
          <div
            v-for="user in leftList"
            :key="user.id"
            class="user-item"
            :class="{ selected: selectedLeftIds.has(user.id) }"
            @click="toggleSelect(user.id)"
          >
            <span class="user-name">{{ user.nickname || '未设置昵称' }}</span>
            <span class="user-phone">{{ user.phone || '' }}</span>
          </div>
          <div v-if="leftList.length === 0 && !loadingLeft" class="empty-tip">暂无数据</div>
        </div>
        <div class="panel-footer">
          <el-pagination
            v-model:current-page="leftPage"
            :page-size="20"
            :total="leftTotal"
            layout="prev, next"
            small
            @current-change="loadLeftUsers"
          />
        </div>
      </div>

      <!-- 中间操作区 -->
      <div class="actions">
        <el-button type="primary" :disabled="selectedLeftIds.size === 0" @click="addMembers">
          添加 →
        </el-button>
        <el-button type="danger" :disabled="selectedRightIds.size === 0" @click="removeMembers">
          ← 移除
        </el-button>
      </div>

      <!-- 右侧：已认证用户 -->
      <div class="panel right-panel">
        <div class="panel-header">
          <span>已认证用户 ({{ rightList.length }})</span>
        </div>
        <div class="panel-list" v-loading="loadingRight">
          <div
            v-for="user in rightList"
            :key="user.id"
            class="user-item"
            :class="{ selected: selectedRightIds.has(user.id) }"
            @click="toggleSelectRight(user.id)"
          >
            <span class="user-name">{{ user.nickname || '未设置昵称' }}</span>
            <span class="user-phone">{{ user.phone || '' }}</span>
          </div>
          <div v-if="rightList.length === 0 && !loadingRight" class="empty-tip">暂未添加认证用户</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { storeCertApi } from '@/api/store-cert'

interface UserBrief {
  id: number
  nickname: string
  avatar: string
  phone: string
}

const searchKeyword = ref('')
const leftPage = ref(1)
const leftTotal = ref(0)
const leftList = ref<UserBrief[]>([])
const rightList = ref<UserBrief[]>([])
const loadingLeft = ref(false)
const loadingRight = ref(false)
const selectedLeftIds = ref(new Set<number>())
const selectedRightIds = ref(new Set<number>())

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadLeftUsers() {
  loadingLeft.value = true
  try {
    const res: any = await storeCertApi.getUsers({
      page: leftPage.value,
      limit: 20,
      keyword: searchKeyword.value,
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

async function loadRightMembers() {
  loadingRight.value = true
  try {
    const res: any = await storeCertApi.getMembers()
    rightList.value = (res?.data || res) || []
    selectedRightIds.value.clear()
  } catch {
    ElMessage.error('加载已认证用户失败')
  } finally {
    loadingRight.value = false
  }
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    leftPage.value = 1
    loadLeftUsers()
  }, 300)
}

function toggleSelect(userId: number) {
  const set = selectedLeftIds.value
  if (set.has(userId)) {
    set.delete(userId)
  } else {
    set.add(userId)
  }
}

function toggleSelectRight(userId: number) {
  const set = selectedRightIds.value
  if (set.has(userId)) {
    set.delete(userId)
  } else {
    set.add(userId)
  }
}

async function addMembers() {
  const ids = Array.from(selectedLeftIds.value)
  if (ids.length === 0) return
  try {
    await Promise.all(ids.map(id => storeCertApi.addMember(id)))
    ElMessage.success(`已添加 ${ids.length} 名用户`)
    selectedLeftIds.value.clear()
    await loadLeftUsers()
    await loadRightMembers()
  } catch {
    ElMessage.error('添加失败')
  }
}

async function removeMembers() {
  const ids = Array.from(selectedRightIds.value)
  if (ids.length === 0) return
  try {
    await Promise.all(ids.map(id => storeCertApi.removeMember(id)))
    ElMessage.success(`已移除 ${ids.length} 名用户`)
    selectedRightIds.value.clear()
    await loadLeftUsers()
    await loadRightMembers()
  } catch {
    ElMessage.error('移除失败')
  }
}

onMounted(() => {
  loadLeftUsers()
  loadRightMembers()
})
</script>

<style scoped>
.store-cert-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}
.page-header h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #303133;
}
.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.transfer-container {
  display: flex;
  align-items: stretch;
  gap: 16px;
  height: calc(100vh - 200px);
  min-height: 500px;
}

.panel {
  flex: 1;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
  flex-shrink: 0;
}

.search-box {
  padding: 10px 16px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.user-item:hover {
  background: #f5f7fa;
}
.user-item.selected {
  background: #ecf5ff;
}

.user-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
.user-phone {
  font-size: 12px;
  color: #909399;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #c0c4cc;
  font-size: 13px;
}

.panel-footer {
  padding: 8px 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
}
</style>
