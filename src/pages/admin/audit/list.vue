<template>
  <view class="audit-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">内容审核</view>
      <view class="nav-right"></view>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { active: currentTab === tab.value }]"
        @tap="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <view v-if="tab.count > 0" class="tab-badge">
          <text>{{ tab.count > 99 ? '99+' : tab.count }}</text>
        </view>
      </view>
    </view>

    <view class="filter-bar">
      <picker
        mode="selector"
        :range="typeOptions"
        range-key="label"
        @change="onTypeChange"
      >
        <view class="filter-item">
          <text>{{ selectedTypeLabel }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <scroll-view
      class="audit-list"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <view v-if="loading && list.length === 0" class="loading-tip">
        <text>加载中...</text>
      </view>

      <view v-if="!loading && list.length === 0" class="empty-tip">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无待审核内容</text>
      </view>

      <checkbox-group @change="onCheckboxChange">
        <view
          v-for="item in list"
          :key="`${item.type}-${item.id}`"
          class="audit-item"
        >
          <view class="item-header">
            <checkbox
              :value="`${item.type}-${item.id}`"
              :checked="selectedItems.has(`${item.type}-${item.id}`)"
            />
            <view class="item-type" :class="item.type">
              <text>{{ getTypeName(item.type) }}</text>
            </view>
            <text class="item-time">{{ formatTime(item.createdAt) }}</text>
          </view>

          <view class="item-content" @tap="openPreview(item)">
            <view v-if="item.type === 'photo'" class="photo-preview">
              <image :src="item.content" mode="aspectFill" />
            </view>
            <view v-else class="text-preview">
              <text>{{ item.content }}</text>
            </view>
          </view>

          <view class="item-footer">
            <text class="user-info">用户ID: {{ item.userId }}</text>
            <view class="ai-result" :class="getAiResultClass(item.aiResult)">
              <text>{{ item.aiResult }}</text>
            </view>
          </view>

          <view v-if="currentTab === 'pending'" class="item-actions">
            <view class="action-btn approve" @tap="handleApprove(item)">
              <text>通过</text>
            </view>
            <view class="action-btn reject" @tap="handleReject(item)">
              <text>拒绝</text>
            </view>
          </view>
        </view>
      </checkbox-group>

      <view v-if="!loading && noMore && list.length > 0" class="no-more-tip">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <view v-if="selectedItems.size > 0" class="batch-actions">
      <view class="batch-btn approve" @tap="handleBatchApprove">
        <text>批量通过 ({{ selectedItems.size }})</text>
      </view>
      <view class="batch-btn reject" @tap="handleBatchReject">
        <text>批量拒绝</text>
      </view>
    </view>

    <view v-if="showRejectModal" class="modal-overlay" @tap="closeRejectModal">
      <view class="reject-modal" @tap.stop>
        <view class="modal-header">
          <text>拒绝原因</text>
        </view>
        <view class="modal-body">
          <textarea
            v-model="rejectReason"
            class="reason-input"
            placeholder="请输入拒绝原因（必填）"
            maxlength="200"
          />
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @tap="closeRejectModal">
            <text>取消</text>
          </view>
          <view class="modal-btn confirm" @tap="confirmReject">
            <text>确认拒绝</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showPreviewModal" class="modal-overlay" @tap="closePreviewModal">
      <view class="preview-modal" @tap.stop>
        <image
          v-if="previewType === 'photo'"
          :src="previewContentData"
          mode="widthFix"
          class="preview-image"
          @tap="closePreviewModal"
        />
        <view v-else class="preview-text">
          <text>{{ previewContentData }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'

interface AuditItem {
  id: number
  type: 'photo' | 'answer'
  targetId: number
  userId: number
  content: string
  aiResult: string
  aiSuggestion: string
  createdAt: string
}

const tabs = ref([
  { label: '待审核', value: 'pending', count: 0 },
  { label: '已通过', value: 'approved', count: 0 },
  { label: '已拒绝', value: 'rejected', count: 0 },
])

const currentTab = ref('pending')
const list = ref<AuditItem[]>([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const limit = 20

const selectedItems = ref(new Set<string>())
const showRejectModal = ref(false)
const rejectReason = ref('')
const currentRejectItem = ref<AuditItem | null>(null)

const showPreviewModal = ref(false)
const previewType = ref('')
const previewContentData = ref('')

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '照片', value: 'photo' },
  { label: '回答', value: 'answer' },
]

const selectedType = ref('')

const selectedTypeLabel = computed(() => {
  const option = typeOptions.find((o) => o.value === selectedType.value)
  return option?.label || '全部类型'
})

onMounted(() => {
  fetchList()
})

const fetchList = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      page.value = 1
      noMore.value = false
    }

    loading.value = true

    const res = await request({
      url: '/audit/pending',
      method: 'GET',
      data: {
        type: selectedType.value,
        page: page.value,
        limit,
        status: currentTab.value,
      },
    })

    const newList = res.list || []

    if (isRefresh) {
      list.value = newList
      refreshing.value = false
    } else {
      if (page.value === 1) {
        list.value = newList
      } else {
        list.value.push(...newList)
      }
    }

    if (newList.length < limit) {
      noMore.value = true
    }

    page.value++
  } catch (e) {
    console.error('fetch audit list error', e)
    refreshing.value = false
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (!loading.value && !noMore.value) {
    fetchList()
  }
}

const onRefresh = () => {
  refreshing.value = true
  fetchList(true)
}

const switchTab = (value: string) => {
  currentTab.value = value
  selectedItems.value.clear()
  fetchList(true)
}

const onTypeChange = (e: any) => {
  selectedType.value = typeOptions[e.detail.value].value
  fetchList(true)
}

const getTypeName = (type: string) => {
  const map: Record<string, string> = {
    photo: '照片',
    answer: '回答',
    user: '用户',
  }
  return map[type] || type
}

const getAiResultClass = (result: string) => {
  if (result.includes('Pass') || result.includes('Normal')) return 'pass'
  if (result.includes('Block') || result.includes('Rejected')) return 'reject'
  return 'review'
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const openPreview = (item: AuditItem) => {
  previewType.value = item.type
  previewContentData.value = item.content
  showPreviewModal.value = true
}

const closePreviewModal = () => {
  showPreviewModal.value = false
}

const onCheckboxChange = (e: any) => {
  selectedItems.value = new Set(e.detail.value)
}

const handleApprove = async (item: AuditItem) => {
  try {
    await request({
      url: `/audit/${item.type}/${item.id}/approve`,
      method: 'POST',
      data: { reason: '管理员审核通过' },
    })
    uni.showToast({ title: '已通过', icon: 'success' })
    list.value = list.value.filter((i) => !(i.type === item.type && i.id === item.id))
  } catch (e) {
    console.error('approve error', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleReject = (item: AuditItem) => {
  currentRejectItem.value = item
  rejectReason.value = ''
  showRejectModal.value = true
}

const closeRejectModal = () => {
  showRejectModal.value = false
  currentRejectItem.value = null
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    uni.showToast({ title: '请输入拒绝原因', icon: 'none' })
    return
  }

  if (!currentRejectItem.value) return

  try {
    await request({
      url: `/audit/${currentRejectItem.value.type}/${currentRejectItem.value.id}/reject`,
      method: 'POST',
      data: { reason: rejectReason.value },
    })
    uni.showToast({ title: '已拒绝', icon: 'success' })
    closeRejectModal()
    list.value = list.value.filter((i) => !(i.type === currentRejectItem.value!.type && i.id === currentRejectItem.value!.id))
  } catch (e) {
    console.error('reject error', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleBatchApprove = async () => {
  if (selectedItems.value.size === 0) return

  uni.showModal({
    title: '提示',
    content: `确定通过选中的 ${selectedItems.value.size} 项吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          for (const key of selectedItems.value) {
            const [type, id] = key.split('-')
            await request({
              url: `/audit/${type}/${id}/approve`,
              method: 'POST',
              data: { reason: '批量审核通过' },
            })
          }
          uni.showToast({ title: '批量通过成功', icon: 'success' })
          selectedItems.value.clear()
          fetchList(true)
        } catch (e) {
          console.error('batch approve error', e)
          uni.showToast({ title: '部分操作失败', icon: 'none' })
        }
      }
    },
  })
}

const handleBatchReject = async () => {
  if (selectedItems.value.size === 0) return

  uni.showModal({
    title: '提示',
    content: '请在拒绝弹窗中填写原因',
    showCancel: true,
    success: (res) => {
      if (res.confirm) {
        rejectReason.value = ''
        showRejectModal.value = true
      }
    },
  })
}

const handleBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.audit-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #fff;
  z-index: 100;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-left,
.nav-right {
  width: 100rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.tabs {
  position: fixed;
  top: 88rpx;
  left: 0;
  right: 0;
  display: flex;
  background-color: #fff;
  z-index: 99;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  position: relative;

  text {
    font-size: 28rpx;
    color: #666;
  }

  &.active {
    text {
      color: #FF6B9D;
      font-weight: bold;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background-color: #FF6B9D;
      border-radius: 2rpx;
    }
  }
}

.tab-badge {
  min-width: 36rpx;
  height: 36rpx;
  background-color: #FF6B9D;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
  padding: 0 8rpx;

  text {
    font-size: 20rpx;
    color: #fff;
  }
}

.filter-bar {
  position: fixed;
  top: 176rpx;
  left: 0;
  right: 0;
  display: flex;
  padding: 16rpx 32rpx;
  background-color: #fff;
  z-index: 99;
}

.filter-item {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 24rpx;

  text {
    font-size: 26rpx;
    color: #333;
  }

  .arrow {
    font-size: 20rpx;
    color: #999;
    margin-left: 8rpx;
  }
}

.audit-list {
  height: calc(100vh - 240rpx);
  padding-top: 240rpx;
}

.loading-tip,
.empty-tip,
.no-more-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.audit-item {
  background-color: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.item-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.item-type {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;

  text {
    font-size: 22rpx;
    color: #fff;
  }

  &.photo {
    background-color: #4CAF50;
  }

  &.answer {
    background-color: #2196F3;
  }
}

.item-time {
  margin-left: auto;
  font-size: 24rpx;
  color: #999;
}

.photo-preview {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 16rpx;

  image {
    width: 100%;
    height: 100%;
  }
}

.text-preview {
  background-color: #f5f5f5;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;

  text {
    font-size: 28rpx;
    color: #333;
    line-height: 1.6;
  }
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  font-size: 24rpx;
  color: #999;
}

.ai-result {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;

  text {
    font-size: 22rpx;
  }

  &.pass {
    background-color: #E8F5E9;
    text {
      color: #4CAF50;
    }
  }

  &.reject {
    background-color: #FFEBEE;
    text {
      color: #F44336;
    }
  }

  &.review {
    background-color: #FFF3E0;
    text {
      color: #FF9800;
    }
  }
}

.item-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 36rpx;

  text {
    font-size: 28rpx;
    font-weight: bold;
  }

  &.approve {
    background-color: #E8F5E9;
    text {
      color: #4CAF50;
    }
  }

  &.reject {
    background-color: #FFEBEE;
    text {
      color: #F44336;
    }
  }
}

.batch-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.batch-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;

  text {
    font-size: 28rpx;
    font-weight: bold;
  }

  &.approve {
    background-color: #4CAF50;
    text {
      color: #fff;
    }
  }

  &.reject {
    background-color: #F44336;
    text {
      color: #fff;
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.reject-modal {
  width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  padding: 32rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
}

.modal-body {
  padding: 32rpx;
}

.reason-input {
  width: 100%;
  height: 200rpx;
  background-color: #f5f5f5;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #333;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
  }

  &.cancel {
    border-right: 1rpx solid #f0f0f0;
    text {
      color: #666;
    }
  }

  &.confirm {
    text {
      color: #FF6B9D;
    }
  }
}

.preview-modal {
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 16rpx;
}

.preview-text {
  background-color: #fff;
  padding: 48rpx;
  border-radius: 24rpx;
  max-width: 80vw;

  text {
    font-size: 28rpx;
    color: #333;
    line-height: 1.8;
  }
}

.no-more-tip {
  padding: 32rpx 0;
  font-size: 24rpx;
  color: #999;
}
</style>
