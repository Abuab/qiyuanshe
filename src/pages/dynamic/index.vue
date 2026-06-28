<template>
  <view class="dynamic-page">
    <!-- ===== 顶部导航：两级固定导航栏 ===== -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 第一级：标题 -->
      <view class="nav-level1">
        <view class="nav-left" @tap="goHome">
          <image
            class="home-icon-img"
            :src="dynamicHomeIcon"
            mode="aspectFit"
            @error="handleImageError"
          />
        </view>
        <text class="nav-title">动态</text>
        <view class="nav-right" />
      </view>
      <!-- 第二级：Tab 切换栏 -->
      <view class="nav-level2">
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
    </view>

    <scroll-view
      class="content-scroll"
      scroll-y
      :style="scrollViewStyle"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
      @scroll="onScroll"
      :scroll-top="scrollToVal"
      :scroll-with-animation="true"
    >
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无动态</text>
      </view>

      <!-- ====== 红娘动态卡片 ====== -->
      <template v-if="currentTab === 'matchmaker'">
        <view
          v-for="item in list"
          :key="item._key"
          class="dynamic-card matchmaker-card"
        >
          <!-- 红娘信息区 -->
          <view class="matchmaker-header">
            <image
              class="mm-avatar"
              :src="getFullImageUrl(item.matchmakerAvatar) || icons.common.defaultAvatar"
              mode="aspectFill"
              @error="handleImageError"
            />
            <view class="mm-info">
              <view class="mm-name-row">
                <text class="mm-name">{{ item.matchmakerName || '红娘' }}</text>
                <view class="mm-official-tag">
                  <text>官方</text>
                </view>
              </view>
            </view>
            <view class="mm-contact-btn" @tap.stop="handleContactMatchmaker(item)">
              <text>联系红娘</text>
            </view>
          </view>

          <!-- 动态内容 -->
          <view v-if="item.content" class="matchmaker-content">
            <text class="mm-content-text">{{ item.content }}</text>
          </view>

          <!-- 关联用户卡片 -->
          <view class="matchmaker-user-card" @tap="goToUserDetail(item.userId)">
            <image
              class="mu-avatar"
              :src="getFullImageUrl(item.avatar) || icons.common.defaultAvatar"
              mode="aspectFill"
              @error="handleImageError"
            />
            <view class="mu-info">
              <view class="mu-name-row">
                <text class="mu-name">{{ item.nickname }}</text>
                <view v-if="item.isRealName" class="realname-tag">
                  <text class="realname-icon">✓</text>
                  <text class="realname-text">已实名</text>
                </view>
              </view>
              <view class="mu-tags">
                <text v-if="item.age">{{ item.age }}岁</text>
                <text v-if="item.age && item.height"> | </text>
                <text v-if="item.height">{{ item.height }}cm</text>
                <text v-if="item.height && item.education"> | </text>
                <text v-if="item.education">{{ item.education }}</text>
                <text v-if="item.education && item.incomeRange"> | </text>
                <text v-if="item.incomeRange">{{ item.incomeRange }}</text>
              </view>
            </view>
            <text class="mu-arrow">›</text>
          </view>

          <!-- 发布时间 -->
          <text class="matchmaker-time">{{ formatTime(item.createdAt) }}</text>
        </view>
      </template>

      <!-- ====== 全部/关注动态卡片 ====== -->
      <template v-else>
      <view
        v-for="item in list"
        :key="item._key"
        class="dynamic-card"
      >
        <!-- 用户信息区 -->
        <view class="user-row" @tap="goToUserDetail(item.userId)">
          <image
            class="user-avatar"
            :src="getFullImageUrl(item.avatar) || icons.common.defaultAvatar"
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

        <!-- 简介卡片：仅显示用户个人简介 -->
        <view v-if="item._displayType === 'intro'" class="card-content">
          <text class="answer-text">{{ item.introText }}</text>
        </view>

        <!-- 相册动态卡片 -->
        <view v-if="item._displayType === 'photo' && item.images && item.images.length > 0" class="card-content">
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
            </view>
          </view>
        </view>

        <!-- 回答动态卡片 -->
        <view v-if="item._displayType === 'answer'" class="card-content">
          <text class="answer-text">{{ item.content }}</text>
          <!-- 话题卡片 -->
          <view v-if="item.questionTitle" class="topic-card" @tap="goToQuestion(item.questionId)">
            <text class="topic-hash">#</text>
            <text class="topic-title">{{ item.questionTitle }}</text>
            <text class="topic-arrow">›</text>
          </view>
        </view>

        <!-- 纯文字动态（旧数据兼容） -->
        <view v-if="item._displayType === 'text' && item.content" class="card-content">
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
              <image v-if="mmEyeIcon" class="mm-eye" :src="mmEyeIcon" mode="aspectFit" />
              <text v-else class="mm-eye-fallback">👁</text>
              <text class="mm-text">红娘牵线</text>
            </view>
          </view>
        </view>
      </view>
      </template>

      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
      <view class="bottom-safe" />
    </scroll-view>

    <tab-bar />

    <!-- 一键回到顶部按钮 -->
    <view v-if="showBackTop" class="float-backtop" @tap="scrollToTop">
      <text class="backtop-arrow">↑</text>
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
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { useIcon } from '@/composables/useIcon'
import { useSystemStore } from '@/store/system'
import { onShow } from '@dcloudio/uni-app'
const { handleImageError } = useImageFallback()

interface DynamicItem {
  id: number
  type: string
  _key: string
  _displayType: string
  userId: number
  nickname: string
  avatar: string
  isRealName: number
  age: number
  height: number
  education: string
  incomeRange: string
  occupation: string
  introText: string
  content: string
  images: string[]
  questionId?: number
  questionTitle?: string
  createdAt: string
  likeCount: number
  commentCount: number
  // 红娘相关字段
  matchmakerId?: number
  matchmakerName?: string
  matchmakerAvatar?: string
  matchmakerTitle?: string
  matchmakerPhone?: string
  matchmakerWechat?: string
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
const systemStore = useSystemStore()
const { getPageIcon } = useIcon()
const myUserId = computed(() => (userStore.userInfo as any)?.id || 0)

// 动态页左上角返回主页图标（后台可配置）
const dynamicHomeIcon = computed(() => {
  return getPageIcon('dynamicHome') || '/static/icons/icon-home.png'
})

// 红娘牵线眼睛图标（后台可配置）
const mmEyeIcon = computed(() => {
  return getPageIcon('mmEye') || ''
})

// scroll-view 绝对定位样式（使 @scroll 事件生效）
const scrollViewStyle = computed(() => {
  const top = (statusBarHeight.value || 20) + 82
  return `position:absolute; top:${top}px; bottom:0; left:0; right:0;`
})

// 一键回到顶部 & 固定标签栏
const showBackTop = ref(false)
const scrollToVal = ref(0)

const onScroll = (e: any) => {
  const top = e.detail.scrollTop
  // 滚动超过 600px 时显示回到顶部按钮
  showBackTop.value = top > 600
}

const scrollToTop = () => {
  scrollToVal.value = scrollToVal.value ? 0 : 0.001
  showBackTop.value = false
}

// 当前登录用户的照片数量（用于判断是否模糊）
const myPhotoCount = ref(0)

// 红娘弹窗
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

const tabs = computed(() => {
  const list: { key: string; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'matchmaker', label: '红娘' },
  ]
  if (userStore.isLoggedIn) {
    list.push({ key: 'follow', label: '关注' })
  }
  return list
})
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
      matchmakerAvatar: (item as any).matchmakerAvatar
        ? getFullImageUrl((item as any).matchmakerAvatar)
        : '',
      images: (item.images || []).map((img: string) =>
        img.startsWith('http') ? img : getFullImageUrl(img),
      ),
    }))

    // 红娘动态不需要拆分，每一条就是一条
    if (currentTab.value === 'matchmaker') {
      const list2 = processed.map((item: DynamicItem) => ({
        ...item,
        _key: `matchmaker_${item.id}`,
      }))
      if (reset) {
        list.value = list2
      } else {
        list.value = [...list.value, ...list2]
      }
      if (items.length < pageSize) {
        noMore.value = true
      } else {
        page.value++
      }
      loading.value = false
      loadingMore.value = false
      isRefreshing.value = false
      return
    }

    // 拆分：introText 与 问答/相册 各自独立成卡
    const flattened: any[] = []
    for (const item of processed) {
      const hasContent = item.content || (item.images && item.images.length > 0)
      // A. 简介卡片
      if (item.introText) {
        flattened.push({
          ...item,
          _displayType: 'intro',
          _key: `intro_${item.id}`,
          content: '',
          images: [],
          questionId: undefined,
          questionTitle: undefined,
        })
      }
      // B. 内容卡片（问答 / 相册）
      if (hasContent) {
        flattened.push({
          ...item,
          _displayType: item.type,
          _key: `${item.type}_${item.id}`,
          introText: '',
        })
      }
    }

    if (reset) {
      list.value = flattened
    } else {
      list.value = [...list.value, ...flattened]
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
    url: `/pages/user-detail/index?id=${item.userId}`,
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

const handleContactMatchmaker = async (item: any) => {
  // 先确保红娘列表已加载
  if (matchmakerList.value.length === 0) {
    await fetchMatchmakerList()
  }
  // 从已加载的红娘列表中按 matchmakerId 匹配，获取完整信息（含 qrCode）
  const matched = matchmakerList.value.find((m: any) => m.id === item.matchmakerId)
  if (matched) {
    selectedMatchmaker.value = matched
    showMatchmaker.value = true
    return
  }
  // 如果列表中找不到，用动态卡片数据兜底
  if (item.matchmakerId) {
    selectedMatchmaker.value = {
      id: item.matchmakerId,
      name: item.matchmakerName || '红娘',
      avatar: item.matchmakerAvatar || '',
      title: item.matchmakerTitle || '',
      phone: item.matchmakerPhone || '',
      wechat: item.matchmakerWechat || '',
      qrCode: item.matchmakerQrCode || '',
    }
    showMatchmaker.value = true
    return
  }
  // 完全没有红娘信息，打开红娘列表
  handleMatchmaker(item)
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
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  fetchMyPhotoCount()
  fetchList(true)
})

// 监听来自首页"媒妁之言"跳转的红娘区切换（通过 globalData 传参）
onShow(() => {
  const app = getApp()
  if (app?.globalData?.dynamicTab === 'matchmaker') {
    app.globalData.dynamicTab = ''
    switchTab('matchmaker')
  }
})
</script>

<style lang="scss" scoped>
.dynamic-page {
  height: 100vh;
  overflow: hidden;
  background: #FFF8FA;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 101;
  background: linear-gradient(180deg, #FFE4EC 0%, #FFE4EC 70%, #FFF0F5 100%);
}
.nav-level1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 32rpx;
}
.nav-level2 {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
}

.nav-left {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.home-icon-img {
  width: 44rpx;
  height: 44rpx;
}

.nav-right {
  width: 80rpx;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 400;
  color: #333;
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
  background-color: #FFF8FA;
}

// 一键回到顶部按钮
.float-backtop {
  position: fixed;
  right: 20rpx;
  bottom: 500rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #FFB3C6 0%, #FFD1DC 40%, #FFFFFF 100%);
  box-shadow: 0 4rpx 16rpx rgba(214, 51, 132, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 998;

  .backtop-arrow {
    font-size: 32rpx;
    font-weight: bold;
    color: #F098B4;
    line-height: 1;
  }
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

/* ========== 红娘动态卡片 ========== */
.matchmaker-card {
  padding: 24rpx;
}

.matchmaker-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.mm-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.mm-info {
  flex: 1;
  margin-left: 16rpx;
}

.mm-name-row {
  display: flex;
  align-items: center;
}

.mm-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.mm-official-tag {
  margin-left: 6rpx;
  padding: 0 6rpx 1rpx;
  background-color: #FF6B9D;
  border-radius: 4rpx;
  line-height: 1;

  text {
    font-size: 18rpx;
    color: #fff;
    line-height: 1;
  }
}

.mm-contact-btn {
  padding: 10rpx 24rpx;
  background-color: #FF6B9D;
  border-radius: 32rpx;
  flex-shrink: 0;

  text {
    font-size: 24rpx;
    color: #fff;
  }
}

.matchmaker-content {
  margin-bottom: 16rpx;
  padding: 0 4rpx;
}

.mm-content-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.7;
  word-break: break-all;
}

/* 关联用户卡片 */
.matchmaker-user-card {
  display: flex;
  align-items: center;
  padding: 20rpx 16rpx;
  background-color: #F5F5F5;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.mu-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.mu-info {
  flex: 1;
  margin-left: 16rpx;
  min-width: 0;
}

.mu-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.mu-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.mu-tags {
  font-size: 24rpx;
  color: #999;
}

.mu-arrow {
  font-size: 32rpx;
  color: #ccc;
  margin-left: 8rpx;
}

.matchmaker-time {
  font-size: 22rpx;
  color: #bbb;
  padding: 0 4rpx;
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
  margin-right: 16rpx;
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
  filter: blur(10px) brightness(0.85);
  transform: scale(1.08);
}

/* 话题卡片 */
.topic-card {
  display: flex;
  align-items: center;
  background-color: #F5F5F5;
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
  font-style: italic;
  background-color: #FFE4EC;
  border-radius: 20rpx;
  padding: 4rpx 14rpx;
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
  width: 28rpx;
  height: 28rpx;
  margin-right: 4rpx;
}

.mm-eye-fallback {
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
