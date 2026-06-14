<template>
  <view class="index-page">
    <!-- 顶部粉色连续区域：导航栏区域 + 通知栏 + 功能图标 -->
    <view class="top-pink-area" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="header-content">
          <text class="brand-title">{{ appName }}</text>
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
      <!-- 热门问答轮播卡片 -->
      <view class="hot-questions-card">
        <view class="section-header">
          <view class="section-title-row">
            <text class="section-title-icon">🔥</text>
            <text class="section-title">热门问答</text>
          </view>
          <text class="section-more" @tap="goToQuestions">更多 ›</text>
        </view>

        <swiper
          class="question-swiper"
          :autoplay="true"
          :circular="true"
          :interval="4000"
          :duration="400"
          :current="questionSwiperIndex"
          @change="onQuestionSwiperChange"
          :style="{ height: '100rpx' }"
        >
          <swiper-item v-for="q in hotQuestions" :key="q.id">
            <view class="question-slide" @tap="goToQuestionDetail(q.id)">
              <view class="question-text-area">
                <text class="question-slide-title">{{ q.title }}</text>
              </view>
              <view class="question-avatars">
                <image
                  v-for="(avatar, idx) in q.avatarList.slice(0, 3)"
                  :key="idx"
                  class="question-avatar"
                  :src="getFullImageUrl(avatar)"
                  mode="aspectFill"
                ></image>
              </view>
            </view>
          </swiper-item>
        </swiper>

        <view class="question-dots">
          <view
            v-for="(_, idx) in hotQuestions"
            :key="idx"
            class="question-dot"
            :class="{ active: idx === questionSwiperIndex }"
          ></view>
        </view>
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
          <view class="filter-icon">
            <view class="filter-row">
              <view class="filter-dot"></view>
              <view class="filter-bar" style="width: 20rpx"></view>
            </view>
            <view class="filter-row">
              <view class="filter-dot"></view>
              <view class="filter-bar" style="width: 14rpx"></view>
            </view>
          </view>
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

    <!-- Hi红娘悬浮按钮 -->
    <view class="float-matchmaker" @tap="handleMatchmakerFloat">
      <text class="float-hi">Hi</text>
      <text class="float-label">红娘</text>
    </view>

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

    <filter-panel v-if="showFilter" ref="filterPanelRef" v-model:show="showFilter" @confirm="onFilterConfirm" @reset="onFilterReset" />

  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { showToast, getFullImageUrl } from '@/utils/common'
import UserCard, { UserCardData } from '@/components/user-card/user-card.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { useFilterStore, FilterData } from '@/store/filter'
import { useUserStore } from '@/store/user'
import FilterPanel from '@/components/filter-panel/filter-panel.vue'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import MatchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import { icons } from '@/config/icons'
import { logger } from '@/utils/logger'
import { useSystemStore } from '@/store/system'

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
  { id: 1, name: '红娘评语', icon: icons.quickEntry.matchmakerComment, bgColor: '#FFE4EC' },
  { id: 2, name: '最新活动', icon: icons.quickEntry.latestActivity, bgColor: '#D6F0FF' },
  { id: 3, name: '相亲圈子', icon: icons.quickEntry.datingCircle, bgColor: '#EDE0FF' },
  { id: 4, name: '我们脱单了', icon: icons.quickEntry.successCouple, bgColor: '#FFF0D6' },
]

const filterTabs: FilterTab[] = [
  { label: '活跃', value: 'active' },
  { label: '精选', value: 'featured' },
  { label: '实名', value: 'verified' },
  { label: '最新', value: 'newest' },
]

const hotQuestions = ref<HotQuestion[]>([])

const currentFilter = ref('active')
const userList = ref<UserCardData[]>([])
const isRefreshing = ref(false)
const loadingMore = ref(false)
const noMoreData = ref(false)
const currentPage = ref(1)
const showFilter = ref(false)
const showNotice = ref(true)
const notices = ref<any[]>([])
const questionSwiperIndex = ref(0)
const statusBarHeight = ref(0)
// 红娘弹窗
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])
const pageSize = 10
const isEmptyFromFilter = ref(false)
const activeFilterData = ref<FilterData | null>(null)

const filterStore = useFilterStore()
const userStore = useUserStore()
const systemStore = useSystemStore()
const appName = computed(() => systemStore.appName)

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
      // 过滤掉当前登录用户自己
      const currentUserId = userStore.userInfo?.id
      let filteredList = result.list
      if (currentUserId) {
        filteredList = result.list.filter((u: UserCardData) => u.id !== currentUserId)
      }

      if (reset) {
        userList.value = filteredList
      } else {
        userList.value = [...userList.value, ...filteredList]
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
    uni.navigateTo({ url: '/pages/activity-list/index' })
  } else if (entry.name === '红娘评语') {
    uni.navigateTo({ url: '/pages/matchmaker-reviews/index' })
  } else if (entry.name === '相亲圈子') {
    uni.navigateTo({ url: '/pages/circles/index' })
  } else if (entry.name === '我们脱单了') {
    uni.navigateTo({ url: '/pages/success-cases/index' })
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

const loadHotQuestions = async () => {
  try {
    const result = await get<{ list: HotQuestion[] }>('/questions/hot')
    if (result?.list) {
      hotQuestions.value = result.list
    }
  } catch (e) {
    // 静默失败，使用已有的默认数据
  }
}

const goToQuestionDetail = (id: number) => {
  uni.navigateTo({
    url: `/pages/question-detail/index?id=${id}`,
  })
}

const onQuestionSwiperChange = (e: any) => {
  questionSwiperIndex.value = e.detail.current
}

const goToFilter = () => {
  showFilter.value = true
}

const handleMatchmakerFloat = async () => {
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
    const res: any = await get('/matchmakers')
    const rawList = Array.isArray(res) ? res : (res?.data || res?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
      avatar: getFullImageUrl(item.avatar),
    }))
  } catch (e) {
    console.log('[红娘] 接口获取失败', e)
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

const onFilterConfirm = (data: FilterData) => {
  applyFilter(data)
}

const onFilterReset = () => {
  handleClearFilter()
}

// 从后端获取公告列表
const fetchAnnouncements = async () => {
  try {
    const res: any = await get('/notices')
    if (Array.isArray(res)) {
      notices.value = res
    } else if (res?.data && Array.isArray(res.data)) {
      notices.value = res.data
    } else if (res?.list && Array.isArray(res.list)) {
      notices.value = res.list
    } else {
      notices.value = []
    }
  } catch (e) {
    console.log('[公告] 接口获取失败', e)
    notices.value = []
  }
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
  // eslint-disable-next-line no-console
  console.log('[首页] BUILD=v15-6a3f1c0')

  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20

  // 公告通知栏
  showNotice.value = uni.getStorageSync('notice_closed') !== new Date().toDateString()
  fetchAnnouncements()

  // 公告弹窗：每天首次进入弹出 popup 类型公告
  const today = new Date().toDateString()
  const alreadyShown = uni.getStorageSync('popup_notice_date') === today

  if (alreadyShown) {
    loadUserList(true)
    loadHotQuestions()
  } else {
    // 从后端获取弹窗类型公告
    setTimeout(async () => {
      let title = `欢迎来到${systemStore.appName}！`
      let content = `${systemStore.appName}小程序正式上线啦！在这里你可以找到心仪的TA，开启美好缘分~\n\n开通VIP可享受更多特权，包括无限查看资料、优先推荐等超值服务！`

      try {
        const res: any = await get('/notices')
        const list = Array.isArray(res) ? res : (res?.data || res?.list || [])
        const popupNotice = list.find((n: any) => n.type === 'popup' && n.status === 1)
        if (popupNotice) {
          title = popupNotice.title
          content = popupNotice.content
        }
      } catch (e) {
        console.log('[弹窗公告] 接口获取失败，使用默认文案')
      }

      uni.showModal({
        title,
        content,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#FF6B9D',
        success: () => {
          uni.setStorageSync('popup_notice_date', today)
          loadUserList(true)
          loadHotQuestions()
        },
      })
    }, 700)
  }

  // 开启分享菜单
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage'],
    fail: () => {},
  })
})

// 每次页面显示时也检查（如从其他页返回）
onShow(() => {
  // 暂不重复弹窗，后续可恢复
})

const onShareAppMessage = () => {
  return {
    title: `${systemStore.appName} - 遇见对的TA`,
    path: '/pages/index/index',
    imageUrl: icons.common.heart,
  }
}

const onShareTimeline = () => {
  return {
    title: `${systemStore.appName} - 遇见对的TA`,
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
  background-color: #FFE4EC;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.brand-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #FF6B9D;
  line-height: 88rpx;
}

.header-capsule {
  width: 174rpx;
  height: 64rpx;
}

.top-pink-area {
  background: linear-gradient(180deg, #FFE4EC 0%, #FFF0F5 40%, #FFF8FA 75%, #FFFFFF 100%);
}

.notice-bar {
  display: flex;
  align-items: center;
  padding: 12rpx 32rpx 16rpx;

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
  margin-top: 0;
  margin-bottom: 120rpx;
}

.quick-entry-section {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 24rpx 16rpx;
  margin-bottom: 0;
}

.quick-entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.quick-entry-icon {
  width: 110rpx;
  height: 110rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.entry-icon {
  width: 60rpx;
  height: 60rpx;
}

.quick-entry-text {
  font-size: 24rpx;
  color: var(--text);
}

.hot-questions-card {
  background-color: #FFF8FA;
  padding: 10rpx 20rpx 6rpx;
  margin: 0 28rpx 12rpx;
  border-radius: 16rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  line-height: 1;
}

.section-title-row {
  display: flex;
  align-items: center;
}

.section-title-icon {
  font-size: 24rpx;
  margin-right: 6rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: bold;
  color: var(--text);
}

.section-more {
  font-size: 24rpx;
  color: #FF6B9D;
  letter-spacing: 1rpx;
}

.question-swiper {
  width: 100%;
}

.question-slide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100rpx;
  padding: 0 4rpx;
}

.question-text-area {
  flex: 1;
  min-width: 0;
  padding-right: 16rpx;
}

.question-slide-title {
  font-size: 26rpx;
  line-height: 1.4;
  color: var(--text);
  white-space: normal;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.question-avatars {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.question-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2px solid #fff;
  margin-left: -14rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);

  &:first-child {
    margin-left: 0;
  }
}

.question-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 4rpx;
  gap: 10rpx;
}

.question-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background-color: #FFCDD6;
  transition: all 0.3s;

  &.active {
    width: 20rpx;
    border-radius: 5rpx;
    background-color: #FF6B9D;
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
  gap: 6rpx;
  padding: 10rpx 20rpx;
  background-color: #FFF5F7;
  border-radius: 24rpx;
}

.filter-icon {
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.filter-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background-color: #FF6B9D;
  flex-shrink: 0;
}

.filter-bar {
  height: 5rpx;
  background-color: #FF6B9D;
  border-radius: 3rpx;
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

// Hi红娘悬浮按钮
.float-matchmaker {
  position: fixed;
  right: 20rpx;
  bottom: 380rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #FFD1DC;
  box-shadow: 0 4rpx 16rpx rgba(214, 51, 132, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 998;

  .float-hi {
    font-size: 20rpx;
    font-weight: 700;
    font-style: italic;
    color: #D63384;
    line-height: 1.1;
  }

  .float-label {
    font-size: 17rpx;
    color: #D63384;
    line-height: 1.1;
  }
}

</style>
