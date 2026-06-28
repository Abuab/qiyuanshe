<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="配置圈子成员"
    width="900px"
    :close-on-click-modal="false"
    @opened="onOpen"
  >
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
        <div class="panel-list" v-loading="leftLoading">
          <div
            v-for="item in leftList"
            :key="item.id"
            class="transfer-item"
            :class="{ selected: leftSelected.has(item.id) }"
            @click="toggleLeftSelect(item.id)"
          >
            <el-checkbox
              :model-value="leftSelected.has(item.id)"
              @click.stop
              @change="toggleLeftSelect(item.id)"
            />
            <el-avatar :src="item.avatar" :size="36" />
            <div class="item-info">
              <span class="item-name">{{ item.nickname }}</span>
              <span class="item-meta">ID:{{ item.id }} · {{ genderLabel(item.gender) }} · {{ item.age }}岁</span>
            </div>
          </div>
          <div v-if="leftList.length === 0 && !leftLoading" class="empty-tip">暂无用户</div>
        </div>
        <div class="panel-footer">
          <el-pagination
            v-model:current-page="leftPage"
            :page-size="leftPageSize"
            :total="leftTotal"
            layout="prev, pager, next"
            small
            @current-change="loadLeft"
          />
        </div>
      </div>

      <!-- 中间操作按钮 -->
      <div class="transfer-actions">
        <el-button
          :disabled="leftSelected.size === 0"
          type="primary"
          :icon="ArrowRight"
          circle
          size="small"
          @click="addToRight"
        />
        <el-button
          :disabled="rightSelected.size === 0"
          type="primary"
          :icon="ArrowLeft"
          circle
          size="small"
          @click="removeFromRight"
        />
      </div>

      <!-- 右侧：已选用户 -->
      <div class="transfer-panel">
        <div class="panel-header">
          <span class="panel-title">已选用户</span>
          <span class="panel-count">共 {{ rightList.length }} 人</span>
        </div>
        <div class="panel-drag-hint">
          <el-icon><Rank /></el-icon>
          <span>可拖拽调整排序</span>
        </div>
        <div class="panel-list" ref="rightListRef">
          <div
            v-for="(item, index) in rightList"
            :key="item.id"
            class="transfer-item"
            :class="{ selected: rightSelected.has(item.id) }"
            draggable="true"
            @click="toggleRightSelect(item.id)"
            @dragstart="onDragStart($event, index)"
            @dragover.prevent="onDragOver($event, index)"
            @drop="onDrop($event, index)"
            @dragend="onDragEnd"
          >
            <el-checkbox
              :model-value="rightSelected.has(item.id)"
              @click.stop
              @change="toggleRightSelect(item.id)"
            />
            <el-icon class="drag-handle"><Rank /></el-icon>
            <el-avatar :src="item.avatar" :size="36" />
            <div class="item-info">
              <span class="item-name">{{ item.nickname }}</span>
              <span class="item-meta">ID:{{ item.id }} · {{ genderLabel(item.gender) }} · {{ item.age }}岁</span>
            </div>
            <span class="sort-badge">{{ index + 1 }}</span>
          </div>
          <div v-if="rightList.length === 0" class="empty-tip">请从左侧选择用户</div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, ArrowRight, ArrowLeft, Rank } from '@element-plus/icons-vue'
import { adminSystem } from '../../api'

const props = defineProps<{
  visible: boolean
  circleId: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: [circleId: number]
}>()

// ===== 左侧数据 =====
const leftLoading = ref(false)
const leftList = ref<any[]>([])
const leftPage = ref(1)
const leftPageSize = 20
const leftTotal = ref(0)
const leftSelected = ref<Set<number>>(new Set())
const searchKeyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ===== 右侧数据 =====
const rightList = ref<any[]>([])
const rightSelected = ref<Set<number>>(new Set())
const saving = ref(false)

// 拖拽状态
const dragIndex = ref(-1)

function genderLabel(g: number) {
  return g === 1 ? '男' : g === 2 ? '女' : '未知'
}

// 打开时加载数据
function onOpen() {
  leftPage.value = 1
  searchKeyword.value = ''
  leftSelected.value = new Set()
  rightSelected.value = new Set()
  loadLeft()
  loadRight()
}

async function loadLeft() {
  leftLoading.value = true
  try {
    const res = await adminSystem.getAllUsers(leftPage.value, leftPageSize, searchKeyword.value)
    const data = (res as any).data
    leftList.value = data?.list || []
    leftTotal.value = data?.total || 0
  } catch {
    leftList.value = []
    leftTotal.value = 0
  }
  leftLoading.value = false
}

async function loadRight() {
  try {
    const res = await adminSystem.getCircleMembers(props.circleId)
    const data = (res as any).data || []
    rightList.value = data
  } catch {
    rightList.value = []
  }
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    leftPage.value = 1
    loadLeft()
  }, 300)
}

function onSearchClear() {
  searchKeyword.value = ''
  leftPage.value = 1
  loadLeft()
}

// ===== 选择逻辑 =====
function toggleLeftSelect(id: number) {
  const s = new Set(leftSelected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  leftSelected.value = s
}

function toggleRightSelect(id: number) {
  const s = new Set(rightSelected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  rightSelected.value = s
}

// ===== 左右转移 =====
function addToRight() {
  const toAdd = leftList.value.filter(item => leftSelected.value.has(item.id))
  // 去重
  const existingIds = new Set(rightList.value.map(item => item.id))
  const newItems = toAdd.filter(item => !existingIds.has(item.id))
  if (newItems.length < toAdd.length) {
    ElMessage.warning('部分用户已在右侧列表中，已自动去重')
  }
  rightList.value = [...rightList.value, ...newItems]
  leftSelected.value = new Set()
}

function removeFromRight() {
  rightList.value = rightList.value.filter(item => !rightSelected.value.has(item.id))
  rightSelected.value = new Set()
}

// ===== 拖拽排序 =====
function onDragStart(e: DragEvent, index: number) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(e: DragEvent, index: number) {
  if (dragIndex.value === -1 || dragIndex.value === index) return
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  // 实时交换位置
  const list = [...rightList.value]
  const [moved] = list.splice(dragIndex.value, 1)
  list.splice(index, 0, moved)
  rightList.value = list
  dragIndex.value = index
}

function onDrop(e: DragEvent, _index: number) {
  e.preventDefault()
}

function onDragEnd() {
  dragIndex.value = -1
}

// ===== 保存 =====
async function handleSave() {
  saving.value = true
  try {
    const members = rightList.value.map((item, index) => ({
      userId: item.id,
      sortOrder: index,
    }))
    await adminSystem.saveCircleMembersBatch(props.circleId, members)
    ElMessage.success('成员配置已保存')
    emit('saved', props.circleId)
    emit('update:visible', false)
  } catch {
    ElMessage.error('保存失败')
  }
  saving.value = false
}

function handleCancel() {
  emit('update:visible', false)
}
</script>

<style scoped>
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

.panel-drag-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 12px;
  color: #909399;
  background: #fafafa;
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
.transfer-item .el-checkbox {
  margin-right: 0;
}

.drag-handle {
  color: #c0c4cc;
  cursor: grab;
  font-size: 16px;
  flex-shrink: 0;
}
.drag-handle:active {
  cursor: grabbing;
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

.sort-badge {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e6e8eb;
  color: #909399;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transfer-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
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
</style>
