<template>
  <div class="store-cert-page">
    <div class="page-header">
      <h3>到店认证管理</h3>
      <p class="subtitle">将用户添加到右侧「已认证」列表，该用户在小程序中将显示已认证状态</p>
    </div>

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
              <span class="item-name">{{ item.nickname }}</span>
              <span class="item-meta">ID:{{ item.id }} · {{ genderLabel(item.gender) }} · {{ item.age }}岁</span>
            </div>
          </div>
          <div v-if="leftList.length === 0 && !loadingLeft" class="empty-tip">暂无用户</div>
        </div>
        <div class="panel-footer">
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

      <!-- 中间操作按钮 -->
      <div class="transfer-actions">
        <el-button
          :disabled="selectedLeftIds.size === 0"
          type="primary"
          :icon="ArrowRight"
          circle
          size="small"
          @click="addToRight"
        />
        <el-button
          :disabled="selectedRightIds.size === 0"
          type="primary"
          :icon="ArrowLeft"
          circle
          size="small"
          @click="removeFromRight"
        />
      </div>

      <!-- 右侧：已认证用户 -->
      <div class="transfer-panel">
        <div class="panel-header">
          <span class="panel-title">已认证用户</span>
          <span class="panel-count">共 {{ rightList.length }} 人</span>
        </div>
        <div class="panel-list">
          <div
            v-for="item in rightList"
            :key="item.id"
            class="transfer-item"
            :class="{ selected: selectedRightIds.has(item.id) }"
            @click="toggleRightSelect(item.id)"
          >
            <el-checkbox
              :model-value="selectedRightIds.has(item.id)"
              @click.stop
              @change="toggleRightSelect(item.id)"
            />
            <el-avatar :src="item.avatar" :size="36" />
            <div class="item-info">
              <span class="item-name">{{ item.nickname }}</span>
              <span class="item-meta">ID:{{ item.id }} · {{ genderLabel(item.gender) }} · {{ item.age }}岁</span>
            </div>
          </div>
          <div v-if="rightList.length === 0" class="empty-tip">请从左侧选择用户</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'
import { storeCertApi } from '@/api/store-cert'

const searchKeyword = ref('')
const leftPage = ref(1)
const leftPageSize = 20
const leftTotal = ref(0)
const leftList = ref<any[]>([])
const rightList = ref<any[]>([])
const loadingLeft = ref(false)
const selectedLeftIds = ref(new Set<number>())
const selectedRightIds = ref(new Set<number>())

let searchTimer: ReturnType<typeof setTimeout> | null = null

function genderLabel(g: number) {
  return g === 1 ? '男' : g === 2 ? '女' : '未知'
}

async function loadLeftUsers() {
  loadingLeft.value = true
  try {
    const res: any = await storeCertApi.getUsers({
      page: leftPage.value,
      limit: leftPageSize,
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
  try {
    const res: any = await storeCertApi.getMembers()
    rightList.value = (res?.data || res) || []
    selectedRightIds.value.clear()
  } catch {
    // ignore
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

function toggleRightSelect(id: number) {
  const s = new Set(selectedRightIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedRightIds.value = s
}

async function addToRight() {
  const toAdd = leftList.value.filter(item => selectedLeftIds.value.has(item.id))
  const existingIds = new Set(rightList.value.map(item => item.id))
  const newItems = toAdd.filter(item => !existingIds.has(item.id))

  if (newItems.length < toAdd.length) {
    ElMessage.warning('部分用户已在右侧列表中，已自动去重')
  }

  if (newItems.length > 0) {
    try {
      const ids = newItems.map(i => i.id)
      await Promise.all(ids.map(id => storeCertApi.addMember(id)))
      ElMessage.success(`已添加 ${ids.length} 名用户`)
      selectedLeftIds.value.clear()
      await loadRightMembers()
    } catch {
      ElMessage.error('添加失败')
    }
  }
}

async function removeFromRight() {
  const ids = Array.from(selectedRightIds.value)
  if (ids.length === 0) return
  try {
    await Promise.all(ids.map(id => storeCertApi.removeMember(id)))
    ElMessage.success(`已移除 ${ids.length} 名用户`)
    selectedRightIds.value.clear()
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
  height: 480px;
}

.transfer-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  min-width: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}
.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.panel-count {
  font-size: 12px;
  color: #909399;
}

.panel-search {
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
}

.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.transfer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f5f5f5;
}
.transfer-item:hover {
  background: #f5f7fa;
}
.transfer-item.selected {
  background: #ecf5ff;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.item-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-meta {
  font-size: 11px;
  color: #909399;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #c0c4cc;
  font-size: 13px;
}

.panel-footer {
  display: flex;
  justify-content: center;
  padding: 8px 0;
  border-top: 1px solid #ebeef5;
}

.transfer-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
}
</style>
