<template>
  <view class="dynamic-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-left" @tap="goHome">
        <text class="home-icon">🏠</text>
      </view>
      <text class="nav-title">动态</text>
      <view class="nav-right" />
    </view>

    <!-- 顶部标签栏 -->
    <view class="tab-bar" :style="{ paddingTop: (44 + statusBarHeight) + 'px' }">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <view v-if="currentTab === tab.key" class="tab-underline" />
      </view>
    </view>

    <scroll-view
      class="content-scroll"
      scroll-y
      enable-flex
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
      :style="{ paddingTop: (44 + statusBarHeight + 46) + 'px' }"
    >
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无动态</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="dynamic-card"
      >
        <!-- 用户信息区 -->
        <view class="user-row" @tap="goToUserDetail(item.userId)">
          <image
            class="user-avatar"
            :src="item.avatar || icons.common.defaultAvatar"
            mode="aspectFill"
            @error="handleImageError"
          />
          <view class="user-info">
            <view class="user-name-row">
              <text class="user-name">{{ item.nickname }}</text>
              <view v-if="item.isRealName" class="realname-tag">
                <text class="realname-icon">✓</text>
                <text class="realname-text">已实名</text>
              </view>
            </view>
            <view class="user-tags">
              <text v-if="item.age">{{ item.age }}岁</text>
              <text v-if="item.age && item.height"> | </text>
              <text v-if="item.height">{{ item.height }}cm</text>
              <text v-if="item.height && item.education"> | </text>
              <text v-if="item.education">{{ item.education }}</text>
              <text v-if="item.education && item.incomeRange"> | </text>
              <text v-if="item.incomeRange">{{ item.incomeRange }}</text>
            </view>
          </view>
        </view>

        <!-- 动态内容区 -->
        <!-- 个人简介动态 -->
        <view v-if="item.type === 'intro' && item.introText" class="card-content intro-card">
          <text class="intro-card-text">{{ item.introText }}</text>
        </view>

        <!-- 相册动态 -->
        <view v-if="item.type === 'photo' && item.images && item.images.length > 0" class="card-content">
          <text class="content-text">{{ item.content || '更新了相册' }}</text>
          <view class="photo-grid">
            <view
              v-for="(img, idx) in item.images.slice(0, 3)"
              :key="idx"
              class="photo-item"
              :class="{
                'photo-blur': shouldBlur(item, idx),
                'photo-last': idx === item.images.length - 1,
              }"
              :style="{ width: item.images.length === 2 ? '340rpx' : '220rpx', height: item.images.length === 2 ? '340rpx' : '220rpx' }"
              @tap="handlePhotoTap(item, idx)"
            >
              <image
                class="photo-img"
                :src="img"
                mode="aspectFill"
                @error="handleImageError"
              />
              <!-- 毛玻璃遮罩 + 提示 -->
              <view v-if="shouldBlur(item, idx) && idx > 0" class="blur-overlay">
                <text class="blur-text">我也更了解你</text>
                <text class="blur-hint">请先上传你的照片吧</text>
                <view class="upload-btn" @tap.stop="goToUploadPhoto">
                  <text class="upload-btn-text">上传照片</text>
                </view>
              </view>
              <!-- 不透明遮罩替代 blur -->
              <view v-if="shouldBlur(item, idx) && idx > 0" class="blur-cover" />
            </view>
          </view>
        </view>

        <!-- 回答动态 -->
        <view v-if="item.type === 'answer'" class="card-content">
          <text class="answer-text">{{ item.content }}</text>
          <!-- 话题卡片 -->
          <view v-if="item.questionTitle" class="topic-card" @tap="goToQuestion(item.questionId)">
            <text class="topic-hash">#</text>
            <text class="topic-title">{{ item.questionTitle }}</text>
            <text class="topic-arrow">›</text>
          </view>
        </view>

        <!-- 纯文字动态（旧数据兼容） -->
        <view v-if="item.type === 'text' && item.content" class="card-content">
          <text class="answer-text">{{ item.content }}</text>
        </view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
          <text class="time-text">{{ formatTime(item.createdAt) }}</text>
          <view class="action-buttons">
            <view class="btn-hi" @tap="handleHi(item)">
              <text class="hi-label">Hi</text>
              <text class="hi-text">认识Ta</text>
            </view>
            <view class="btn-matchmaker" @tap="handleMatchmaker(item)">
              <text class="mm-eye">👁</text>
              <text class="mm-text">红娘牵线</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
      <view class="bottom-safe" />
    </scroll-view>

    <!-- 红娘弹窗 -->
    <matchmaker-popup
      :show="showMatchmaker"
      :matchmaker="selectedMatchmaker"
      @update:show="showMatchmaker = $event"
      @close="showMatchmaker = false"
      @more="openMatchmakerList"
    />

    <matchmaker-list-popup
      :show="showMatchmakerList"
      :matchmakers="matchmakerList"
      @update:show="showMatchmakerList = $event"
      @close="showMatchmakerList = false"
      @contact="onSelectMatchmaker"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { useUserStore } from '@/store/user'
import { useImageFallback } from '@/composables/useImageFallback'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import MatchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
const { handleImageError } = useImageFallback()

interface DynamicItem {
  id: number
  type: string
  userId: number
  nickname: string
  avatar: string
  isRealName: number
  age: number
  height: number
  education: string
  incomeRange: string
  introText: string
  content: string
  images: string[]
  questionId?: number
  questionTitle?: string
  createdAt: string
  likeCount: number
  commentCount: number
}

const list = ref<DynamicItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = 10
const statusBarHeight = ref(0)
const userStore = useUserStore()
const myUserId = computed(() => (userStore.userInfo as any)?.id || 0)

// 当前登录用户的照片数量（用于判断是否模糊）
const myPhotoCount = ref(0)

// 红娘弹窗
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'matchmaker', label: '红娘' },
  { key: 'follow', label: '关注' },
]
const currentTab = ref('all')

/** 判断是否应该模糊：查看者只有头像、没有其他照片 */
const shouldBlur = (item: DynamicItem, imgIndex: number): boolean => {
  // 自己的动态不模糊
  if (item.userId === myUserId.value) return false
  // 只有第二张及之后的才模糊
  if (imgIndex === 0) return false
  // 如果查看者有上传照片（>1），不模糊
  if (myPhotoCount.value > 1) return false
  return true
}

const formatTime = (dateStr: string): string => {
  if (!dateStr) return ''
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}天前`
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const fetchMyPhotoCount = async () => {
  try {
    const res = await request<{ list: any[] }>({
      url: '/users/photos',
      method: 'GET',
    })
    const data = res as any
    myPhotoCount.value = data?.list?.length || 0
  } catch { /* ignore */ }
}

const fetchList = async (reset = false) => {
  if (reset) {
    page.value = 1
    noMore.value = false
  }
  if (noMore.value || loadingMore.value) return

  loadingMore.value = true
  try {
    const params: Record<string, unknown> = {
      page: page.value,
      limit: pageSize,
    }
    if (currentTab.value !== 'all') {
      params.type = currentTab.value
    }
    const res = await request<{ list: DynamicItem[]; total?: number }>({
      url: '/dynamics',
      method: 'GET',
      data: params,
    })

    const data = res as unknown as { list: DynamicItem[]; total?: number }
    const items = data.list || []

    const processed = items.map((item: DynamicItem) => ({
      ...item,
      avatar: item.avatar ? getFullImageUrl(item.avatar) : icons.common.defaultAvatar,
      images: (item.images || []).map((img: string) =>
        img.startsWith('http') ? img : getFullImageUrl(img),
      ),
    }))

    if (reset) {
      list.value = processed
    } else {
      list.value = [...list.value, ...processed]
    }

    if (items.length < pageSize) {
      noMore.value = true
    } else {
      page.value++
    }
  } catch (e) {
    console.error('fetch dynamics error', e)
  } finally {
    loading.value = false
    loadingMore.value = false
    isRefreshing.value = false
  }
}

const onRefresh = () => {
  isRefreshing.value = true
  fetchList(true)
}

const onLoadMore = () => {
  fetchList(false)
}

const switchTab = (key: string) => {
  if (currentTab.value === key) return
  currentTab.value = key
  list.value = []
  fetchList(true)
}

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

const goToUserDetail = (userId: number) => {
  uni.navigateTo({
    url: `/pages/user-detail/index?id=${userId}`,
  })
}

const goToQuestion = (questionId?: number) => {
  if (!questionId) return
  uni.navigateTo({
    url: `/pages/question-detail/index?id=${questionId}`,
  })
}

const handlePhotoTap = (item: DynamicItem, idx: number) => {
  // 如果该图片被模糊了，弹提示引导上传
  if (shouldBlur(item, idx) && idx > 0) {
    uni.showModal({
      title: '提示',
      content: '我也想更了解你，请先上传你的照片吧',
      confirmText: '上传照片',
      cancelText: '取消',
      confirmColor: '#FF6B9D',
      success: (res) => {
        if (res.confirm) {
          goToUploadPhoto()
        }
      },
    })
    return
  }
  // 正常预览
  uni.previewImage({
    urls: item.images,
    current: idx,
  })
}

const goToUploadPhoto = () => {
  uni.navigateTo({
    url: '/pages/edit-profile/index?tab=photos',
  })
}

const handleHi = (item: DynamicItem) => {
  if (item.userId === myUserId.value) {
    uni.showToast({ title: '这是你自己的动态', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/chat/index?userId=${item.userId}`,
  })
}

const handleMatchmaker = async (item: DynamicItem) => {
  if (item.userId === myUserId.value) {
    uni.showToast({ title: '这是你自己的动态', icon: 'none' })
    return
  }
  // 先加载红娘列表
  if (matchmakerList.value.length === 0) {
    await fetchMatchmakerList()
  }
  if (matchmakerList.value.length === 0) {
    uni.showToast({ title: '暂无红娘信息', icon: 'none' })
    return
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  showMatchmaker.value = true
}

const fetchMatchmakerList = async () => {
  try {
    const res: any = await request({ url: '/matchmakers', method: 'GET' })
    const rawList = Array.isArray(res) ? res : (res?.data || res?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
      avatar: getFullImageUrl(item.avatar),
    }))
  } catch {
    // 静默失败
    matchmakerList.value = []
  }
}

const openMatchmakerList = () => {
  showMatchmaker.value = false
  showMatchmakerList.value = true
}

const onSelectMatchmaker = (matchmaker: any) => {
  showMatchmakerList.value = false
  selectedMatchmaker.value = matchmaker
  showMatchmaker.value = true
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  fetchMyPhotoCount()
  fetchList(true)
})
</script>

<style lang="scss" scoped>
.dynamic-page {
  min-height: 100vh;
  background: #FFF0F3;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #FFF0F3;
  z-index: 101;
}

.nav-left {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.home-icon {
  font-size: 40rpx;
}

.nav-right {
  width: 80rpx;
}

.nav-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.tab-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFF0F3;
  z-index: 100;
}

.tab-item {
  padding: 16rpx 40rpx;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tab-text {
  font-size: 30rpx;
  color: #999;
  line-height: 1.4;
}

.tab-item.active .tab-text {
  color: #333;
  font-weight: 600;
}

.tab-underline {
  width: 40rpx;
  height: 6rpx;
  background-color: #FF6B9D;
  border-radius: 3rpx;
  margin-top: 8rpx;
}

.content-scroll {
  height: 100vh;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.dynamic-card {
  margin: 20rpx 24rpx;
  padding: 28rpx 24rpx 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

/* 用户信息区 */
.user-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.user-info {
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.user-name-row {
  display: flex;
  align-items: center;
}

.user-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.realname-tag {
  margin-left: 12rpx;
  display: flex;
  align-items: center;
  padding: 2rpx 12rpx;
  background-color: #E8F4FD;
  border-radius: 8rpx;
}

.realname-icon {
  font-size: 20rpx;
  color: #409EFF;
  margin-right: 4rpx;
}

.realname-text {
  font-size: 20rpx;
  color: #409EFF;
}

.user-tags {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}

/* 动态内容区 */
.card-content {
  margin-bottom: 20rpx;
  padding: 0 4rpx;
}

/* 个人简介卡片 */
.intro-card {
  padding: 20rpx 24rpx;
  background-color: #FFF8FA;
  border-radius: 10rpx;
  border-left: 4rpx solid #FF6B9D;
}

.intro-card-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.content-text {
  font-size: 28rpx;
  color: #555;
  line-height: 1.7;
  margin-bottom: 16rpx;
  display: block;
}

.answer-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.7;
  margin-bottom: 16rpx;
  display: block;
  word-break: break-all;
}

/* 图片网格 */
.photo-grid {
  display: flex;
  flex-wrap: nowrap;
}

.photo-item {
  position: relative;
  margin-right: 10rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f5f5f5;
}

.photo-item.photo-last {
  margin-right: 0;
}

.photo-img {
  width: 100%;
  height: 100%;
}

.photo-blur .photo-img {
  opacity: 0.3;
}

.blur-cover {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.6);
}

.blur-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.blur-text {
  font-size: 26rpx;
  color: #FF6B9D;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.blur-hint {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.upload-btn {
  background: linear-gradient(135deg, #FF6B9D, #FF8EAF);
  padding: 14rpx 44rpx;
  border-radius: 40rpx;
}

.upload-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

/* 话题卡片 */
.topic-card {
  display: flex;
  align-items: center;
  background-color: #FFF5F5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}

.topic-hash {
  font-size: 36rpx;
  color: #FF6B9D;
  font-weight: bold;
  margin-right: 12rpx;
}

.topic-title {
  font-size: 28rpx;
  color: #333;
  flex: 1;
}

.topic-arrow {
  font-size: 32rpx;
  color: #ccc;
}

/* 底部操作栏 */
.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20rpx;
  border-top: 1rpx solid #f5f5f5;
}

.time-text {
  font-size: 22rpx;
  color: #bbb;
}

.action-buttons {
  display: flex;
  align-items: center;
}

.btn-hi {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 40rpx;
  border: 2rpx solid #FF6B9D;
  background-color: #fff;
  margin-right: 16rpx;
}

.hi-label {
  font-size: 24rpx;
  color: #FF6B9D;
  font-weight: 600;
  margin-right: 4rpx;
}

.hi-text {
  font-size: 24rpx;
  color: #FF6B9D;
}

.btn-matchmaker {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8EAF);
}

.mm-eye {
  font-size: 24rpx;
  margin-right: 4rpx;
}

.mm-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
}

.loading-more {
  text-align: center;
  padding: 30rpx;
  font-size: 24rpx;
  color: #999;
}

.no-more {
  text-align: center;
  padding: 30rpx;
  font-size: 24rpx;
  color: #ccc;
}

.bottom-safe {
  height: 60rpx;
}
</style>
