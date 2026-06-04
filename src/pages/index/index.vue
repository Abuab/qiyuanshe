<template>
  <view class="index-page">
    <view class="header">
      <view class="header-content">
        <text class="brand-title">栖缘社</text>
        <view class="header-capsule"></view>
      </view>
    </view>

    <view v-if="showNotice && notices.length" class="notice-bar">
      <text class="notice-icon">📢</text>
      <swiper class="notice-swiper" vertical autoplay circular interval="3000">
        <swiper-item v-for="n in notices" :key="n.id" @tap="goNotice(n.id)">
          <text class="notice-text">{{ n.title }}</text>
        </swiper-item>
      </swiper>
      <text class="notice-close" @tap.stop="closeNotice">×</text>
    </view>

    <scroll-view
      class="content-scroll"
      scroll-y
      enable-flex
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view class="quick-entry-section">
        <view
          v-for="entry in quickEntries"
          :key="entry.id"
          class="quick-entry-item"
          @tap="handleQuickEntry(entry)"
        >
          <view class="quick-entry-icon" :style="{ backgroundColor: entry.bgColor }">
            <image class="entry-icon" :src="entry.icon" mode="aspectFit"></image>
          </view>
          <text class="quick-entry-text">{{ entry.name }}</text>
        </view>
      </view>

      <view class="hot-questions-section">
        <view class="section-header">
          <text class="section-title">热门问答</text>
          <text class="section-more" @tap="goToQuestions">更多></text>
        </view>

        <scroll-view class="questions-scroll" scroll-x>
          <view
            v-for="question in hotQuestions"
            :key="question.id"
            class="question-card"
            @tap="goToQuestionDetail(question.id)"
          >
            <text class="question-title">{{ question.title }}</text>
            <view class="question-avatars">
              <image
                v-for="(avatar, index) in question.avatarList.slice(0, 3)"
                :key="index"
                class="question-avatar"
                :src="avatar"
                mode="aspectFill"
              ></image>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="filter-section">
        <view class="filter-tabs">
          <view
            v-for="tab in filterTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: currentFilter === tab.value }"
            @tap="switchFilter(tab.value)"
          >
            <text class="tab-label">{{ tab.label }}</text>
            <view v-if="currentFilter === tab.value" class="tab-underline"></view>
          </view>
        </view>

        <view class="filter-btn" @tap="goToFilter">
          <text class="filter-btn-text">筛选</text>
        </view>
      </view>

      <view class="user-list-section">
        <user-card
          v-for="user in userList"
          :key="user.id"
          :user="user"
          @click="goToUserDetail(user)"
        />

        <view v-if="loadingMore" class="loading-more">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-if="noMoreData && userList.length > 0" class="no-more-data">
          <text class="no-more-text">没有更多了</text>
        </view>

        <view v-if="userList.length === 0 && !loadingMore" class="empty-list">
          <text class="empty-text">{{ isEmptyFromFilter ? '暂无符合条件的用户，试试放宽条件吧' : '暂无匹配用户' }}</text>
          <view v-if="isEmptyFromFilter" class="clear-filter-btn" @tap="handleClearFilter">
            <text>清除筛选</text>
          </view>
        </view>
      </view>

      <view class="bottom-safe-area"></view>
    </scroll-view>

    <tab-bar />

    <filter-panel ref="filterPanelRef" v-model:show="showFilter" @confirm="onFilterConfirm" @reset="onFilterReset" />

  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { showToast } from '@/utils/common'
import UserCard, { UserCardData } from '@/components/user-card/user-card.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { useFilterStore, FilterData } from '@/store/filter'
import FilterPanel from '@/components/filter-panel/filter-panel.vue'
import { icons } from '@/config/icons'
import { logger } from '@/utils/logger'

interface QuickEntry {
  id: number
  name: string
  icon: string
  bgColor: string
}

interface HotQuestion {
  id: number
  title: string
  avatarList: string[]
}

interface FilterTab {
  label: string
  value: string
}

const quickEntries: QuickEntry[] = [
  { id: 1, name: '红娘评语', icon: icons.quickEntry.matchmakerComment, bgColor: '#FFF0F5' },
  { id: 2, name: '最新活动', icon: icons.quickEntry.latestActivity, bgColor: '#E6F7FF' },
  { id: 3, name: '相亲圈子', icon: icons.quickEntry.datingCircle, bgColor: '#F9F0FF' },
  { id: 4, name: '我们脱单了', icon: icons.quickEntry.successCouple, bgColor: '#FFF7E6' },
]

const filterTabs: FilterTab[] = [
  { label: '活跃', value: 'active' },
  { label: '精选', value: 'featured' },
  { label: '实名', value: 'verified' },
  { label: '最新', value: 'newest' },
]

const hotQuestions = ref<HotQuestion[]>([
  {
    id: 1,
    title: '你理想中的婚姻生活是什么样的？',
    avatarList: ['/static/default-avatar.png', '/static/default-avatar.png', '/static/default-avatar.png'],
  },
  {
    id: 2,
    title: '相亲时最看重对方的什么条件？',
    avatarList: ['/static/default-avatar.png', '/static/default-avatar.png'],
  },
  {
    id: 3,
    title: '结婚后要不要和父母一起住？',
    avatarList: ['/static/default-avatar.png', '/static/default-avatar.png', '/static/default-avatar.png'],
  },
])

const currentFilter = ref('active')
const userList = ref<UserCardData[]>([])
const isRefreshing = ref(false)
const loadingMore = ref(false)
const noMoreData = ref(false)
const currentPage = ref(1)
const showFilter = ref(false)
const showNotice = ref(true)
const notices = ref<any[]>([])
const pageSize = 10
const isEmptyFromFilter = ref(false)
const activeFilterData = ref<FilterData | null>(null)

const filterStore = useFilterStore()

const loadUserList = async (reset = false, filterParams?: FilterData) => {
  if (reset) {
    currentPage.value = 1
    noMoreData.value = false
  }

  if (noMoreData.value || loadingMore.value) return

  loadingMore.value = true

  try {
    const params: Record<string, unknown> = {
      page: currentPage.value,
      limit: pageSize,
      tab: currentFilter.value,
    }

    // 合并筛选参数
    if (filterParams) {
      if (filterParams.keyword) params.keyword = filterParams.keyword
      if (filterParams.gender !== undefined) params.gender = filterParams.gender
      if (filterParams.ageMin && filterParams.ageMin > 18) params.ageMin = filterParams.ageMin
      if (filterParams.ageMax && filterParams.ageMax < 80) params.ageMax = filterParams.ageMax
      if (filterParams.heightMin && filterParams.heightMin > 140) params.heightMin = filterParams.heightMin
      if (filterParams.heightMax && filterParams.heightMax < 200) params.heightMax = filterParams.heightMax
      if (filterParams.education) params.education = filterParams.education
      if (filterParams.incomeRange) params.incomeRange = filterParams.incomeRange
      if (filterParams.maritalStatus) params.maritalStatus = filterParams.maritalStatus
      if (filterParams.isRealName !== undefined) params.isRealName = filterParams.isRealName
      if (filterParams.residence) params.residence = filterParams.residence
      if (filterParams.hometown) params.hometown = filterParams.hometown
    }

    const result = await get<{ list: UserCardData[]; total: number }>('/users/recommend', params)

    if (result && result.list) {
      if (reset) {
        userList.value = result.list
      } else {
        userList.value = [...userList.value, ...result.list]
      }

      if (result.list.length < pageSize) {
        noMoreData.value = true
      } else {
        currentPage.value++
      }
    } else {
      noMoreData.value = true
    }
  } catch (err: unknown) {
    const error = err as Error
    logger.error('加载用户列表失败:', error)
    if (error.message === 'Server Error') {
      showToast('服务器繁忙，请稍后重试', 'none')
    } else {
      showToast('加载失败，请下拉重试', 'none')
    }
  } finally {
    loadingMore.value = false
  }
}

const onRefresh = async () => {
  isRefreshing.value = true
  await loadUserList(true)
  isRefreshing.value = false
}

const onLoadMore = () => {
  if (!noMoreData.value && !loadingMore.value) {
    loadUserList()
  }
}

const switchFilter = (value: string) => {
  if (currentFilter.value === value) return
  currentFilter.value = value
  loadUserList(true)
}

const handleQuickEntry = (entry: QuickEntry) => {
  if (entry.name === '最新活动') {
    uni.navigateTo({
      url: '/pages/activity-list/index',
    })
  } else {
    showToast('功能开发中', 'none')
  }
}

const goToQuestions = () => {
  uni.switchTab({
    url: '/pages/questions/index',
    fail: () => uni.navigateTo({ url: '/pages/questions/index' }),
  })
}

const goToQuestionDetail = (id: number) => {
  uni.navigateTo({
    url: `/pages/question-detail/index?id=${id}`,
  })
}

const goToFilter = () => {
  showFilter.value = true
}

const onFilterConfirm = (data: FilterData) => {
  applyFilter(data)
}

const onFilterReset = () => {
  handleClearFilter()
}

// Mock 公告数据兜底（后端暂无 announcements 接口，直接使用本地数据，避免 404 控制台报错）
const getMockNotices = () => [
  { id: 1, title: '栖缘社小程序正式上线啦！', type: 'banner' },
  { id: 2, title: '开通VIP享受更多特权~', type: 'banner' },
]

// 后端 announcements 接口暂未部署，直接使用 mock 数据
// 待后端接口上线后，改为调用：request({ url: '/announcements', method: 'GET', data: { type: 'banner' } })
const fetchAnnouncements = () => {
  notices.value = getMockNotices()
}

// Mock 弹窗公告数据（后端暂无 announcements popup 接口，直接使用本地数据）
const getMockPopupNotice = () => ({
  id: 99,
  title: '欢迎来到栖缘社！',
  content: '栖缘社小程序正式上线啦！在这里你可以找到心仪的TA，开启美好缘分~\n\n开通VIP可享受更多特权，包括无限查看资料、优先推荐等超值服务！',
})

// 后端 announcements popup 接口暂未部署，使用 mock 数据弹窗
// 待后端接口上线后，改为调用：request({ url: '/announcements', method: 'GET', data: { type: 'popup' } })
const checkPopupAnnouncement = () => {
  // 当天已展示过则不再弹出
  const today = new Date().toDateString()
  const lastPopupDate = uni.getStorageSync('popup_notice_date')
  if (lastPopupDate === today) return

  const notice = getMockPopupNotice()
  uni.showModal({
    title: notice.title,
    content: notice.content,
    showCancel: false,
    confirmText: '我知道了',
    confirmColor: '#FF6B9D',
    success: () => {
      uni.setStorageSync('popup_notice_date', today)
    },
  })
}

const closeNotice = () => {
  showNotice.value = false
  uni.setStorageSync('notice_closed', new Date().toDateString())
}

const goNotice = (id: number) => {
  uni.navigateTo({ url: `/pages/notice-detail/index?id=${id}` })
}

/** 应用筛选条件并重新加载 */
const applyFilter = (data: FilterData) => {
  isEmptyFromFilter.value = true
  activeFilterData.value = data
  loadUserList(true, data)
}

/** 清除筛选条件 */
const handleClearFilter = () => {
  isEmptyFromFilter.value = false
  activeFilterData.value = null
  filterStore.clearFilter()
  loadUserList(true)
}

const goToUserDetail = (user: UserCardData) => {
  uni.navigateTo({
    url: `/pages/user-detail/index?id=${user.id}`,
  })
}

onMounted(() => {
  // 公告：当日关闭后不再显示
  showNotice.value = uni.getStorageSync('notice_closed') !== new Date().toDateString()
  fetchAnnouncements()

  // 延时弹出公告
  setTimeout(() => {
    checkPopupAnnouncement()
  }, 800)

  // 开启分享菜单（开发工具中可能不可用，加 fail 静默处理）
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage'],
    fail: () => {
      console.log('[分享]showShareMenu 开发工具跳过')
    },
  })

  loadUserList(true)
})

// 每次页面显示时也检查（如从其他页返回）
onShow(() => {
  setTimeout(() => {
    checkPopupAnnouncement()
  }, 300)
})

const onShareAppMessage = () => {
  return {
    title: '栖缘社 - 遇见对的TA',
    path: '/pages/index/index',
    imageUrl: icons.common.heart,
  }
}

const onShareTimeline = () => {
  return {
    title: '栖缘社 - 遇见对的TA',
    imageUrl: icons.common.heart,
  }
}
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  background-color: var(--bg);
  display: flex;
  flex-direction: column;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4ED 100%);
  padding-top: var(--status-bar-height);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
}

.brand-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #FF6B9D;
}

.header-capsule {
  width: 168rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 28rpx;
}

.notice-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx;
  background: linear-gradient(135deg, #FFF5F7, #FFE4ED);
  margin-bottom: 20rpx;

  .notice-swiper {
    flex: 1;
    height: 40rpx;
    margin: 0 16rpx;
  }

  .notice-text {
    font-size: 26rpx;
    color: #FF6B9D;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
}

.notice-icon {
  font-size: 28rpx;
}

.notice-close {
  font-size: 32rpx;
  color: #999;
  padding-left: 16rpx;
}

.content-scroll {
  flex: 1;
  margin-top: calc(var(--status-bar-height) + 96rpx);
  margin-bottom: 120rpx;
}

.quick-entry-section {
  display: flex;
  justify-content: space-around;
  padding: 32rpx 24rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.quick-entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.quick-entry-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.entry-icon {
  width: 56rpx;
  height: 56rpx;
}

.quick-entry-text {
  font-size: 24rpx;
  color: var(--text);
}

.hot-questions-section {
  background-color: #fff;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--text);
}

.section-more {
  font-size: 26rpx;
  color: #FF6B9D;
}

.questions-scroll {
  white-space: nowrap;
  height: 180rpx;
}

.question-card {
  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;
  width: 420rpx;
  height: 160rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFF0F5 100%);
  border-radius: 16rpx;
  margin-right: 20rpx;
}

.question-title {
  font-size: 28rpx;
  color: var(--text);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.question-avatars {
  display: flex;
  margin-top: 16rpx;
}

.question-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 2px solid #fff;
  margin-left: -16rpx;

  &:first-child {
    margin-left: 0;
  }
}

.filter-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.filter-tabs {
  display: flex;
  gap: 40rpx;
}

.filter-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tab-label {
  font-size: 28rpx;
  color: #666;

  .active & {
    font-size: 32rpx;
    font-weight: bold;
    color: #FF6B9D;
  }
}

.tab-underline {
  position: absolute;
  bottom: -8rpx;
  width: 40rpx;
  height: 6rpx;
  background-color: #FF6B9D;
  border-radius: 3rpx;
}

.filter-btn {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background-color: #FFF5F7;
  border-radius: 24rpx;
}

.filter-btn-text {
  font-size: 24rpx;
  color: #FF6B9D;
}

.user-list-section {
  padding: 0 24rpx;
}

.loading-more,
.no-more-data,
.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
}

.loading-text,
.no-more-text,
.empty-text {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.clear-filter-btn {
  margin-top: 24rpx;
  padding: 12rpx 40rpx;
  border: 2rpx solid #FF6B9D;
  border-radius: 32rpx;

  text {
    font-size: 26rpx;
    color: #FF6B9D;
  }
}

.bottom-safe-area {
  height: 40rpx;
}

</style>
