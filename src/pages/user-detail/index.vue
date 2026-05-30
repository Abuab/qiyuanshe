<template>
  <view class="user-detail-page">
    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <template v-else-if="userData">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <view class="nav-title">{{ userData.nickname || '用户' }}</view>
        <view class="nav-right">
          <text class="more-icon">⋮</text>
          <text class="eye-icon" :class="{ active: userData.isFollowed }">{{ userData.isFollowed ? '👁' : '👁‍🗨' }}</text>
        </view>
      </view>

      <view class="photo-section">
        <swiper
          class="photo-swiper"
          :current="currentPhotoIndex"
          @change="onPhotoChange"
          :indicator-dots="false"
          :autoplay="false"
          :circular="false"
        >
          <swiper-item v-for="(photo, index) in userData.photos" :key="index">
            <image
              class="photo-image"
              :src="photo.url || photo"
              mode="aspectFill"
              @tap="previewPhoto(index)"
            />
          </swiper-item>
        </swiper>

        <view class="share-btn" @tap="showSharePanel">
          <text class="share-icon">↗</text>
        </view>

        <view v-if="userData.photos && userData.photos.length > 1" class="photo-thumbnails">
          <view
            v-for="(photo, index) in userData.photos"
            :key="index"
            class="thumbnail-item"
            :class="{ active: currentPhotoIndex === index }"
            @tap="currentPhotoIndex = index"
          >
            <image class="thumbnail-image" :src="photo.url || photo" mode="aspectFill" />
          </view>
        </view>
      </view>

      <view class="info-card">
        <view class="name-row">
          <view class="name-section">
            <text class="user-name">{{ userData.nickname }}</text>
            <view class="id-tag">
              <text class="id-label">ID:</text>
              <text class="id-value">{{ userData.id }}</text>
            </view>
          </view>
          <view class="follow-btn" @tap="toggleFollow">
            <text class="heart-icon" :class="{ filled: userData.isFollowed }">
              {{ userData.isFollowed ? '❤️' : '🤍' }}
            </text>
            <text class="follow-text">{{ userData.isFollowed ? '已关注' : '关注' }}</text>
          </view>
        </view>

        <view class="basic-info">
          <text v-if="userData.age">{{ userData.age }}岁</text>
          <text v-if="userData.age" class="dot">·</text>
          <text v-if="userData.height">{{ userData.height }}cm</text>
          <text v-if="userData.height" class="dot">·</text>
          <text v-if="userData.weight">{{ userData.weight }}kg</text>
          <text v-if="userData.weight" class="dot">·</text>
          <text v-if="userData.education">{{ userData.education }}</text>
        </view>

        <view class="tag-row">
          <view v-if="userData.birthYear" class="tag pink-tag">
            <text class="tag-icon">🎂</text>
            <text>{{ userData.birthYear }}年·{{ userData.zodiac || '' }}·{{ userData.constellation || '' }}</text>
          </view>
          <view v-if="userData.occupation" class="tag blue-tag">
            <text class="tag-icon">💼</text>
            <text>{{ userData.occupation }}</text>
          </view>
        </view>

        <view class="address-row">
          <view v-if="userData.hometown" class="address-item">
            <text class="address-icon blue">📍</text>
            <text class="address-label">户籍</text>
            <text class="address-value">{{ userData.hometown }}</text>
          </view>
          <view v-if="userData.residence" class="address-item">
            <text class="address-icon orange">📍</text>
            <text class="address-label">现居</text>
            <text class="address-value">{{ userData.residence }}</text>
          </view>
        </view>
      </view>

      <view class="auth-section">
        <view class="section-header">
          <view class="section-title">
            <text class="shield-icon">🛡</text>
            <text>身份认证</text>
          </view>
          <text class="auth-tip">点亮的为已认证</text>
        </view>

        <scroll-view class="auth-scroll" scroll-x>
          <view class="auth-items">
            <view class="auth-item" @tap="showAuthDetail('realname')">
              <view class="auth-icon" :class="{ verified: userData.isRealName }">
                <text>{{ userData.isRealName ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">实名</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('education')">
              <view class="auth-icon" :class="{ verified: userData.education }">
                <text>{{ userData.education ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">学历</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('housing')">
              <view class="auth-icon" :class="{ verified: userData.housingStatus }">
                <text>{{ userData.housingStatus ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">房</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('car')">
              <view class="auth-icon" :class="{ verified: userData.carStatus }">
                <text>{{ userData.carStatus ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">车</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('commitment')">
              <view class="auth-icon verified">
                <text>✓</text>
              </view>
              <text class="auth-label">单身承诺</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('marital')">
              <view class="auth-icon" :class="{ verified: userData.maritalStatus }">
                <text>{{ userData.maritalStatus ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">婚况</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="about-section">
        <view class="section-header">
          <view class="section-title">
            <text class="book-icon">📖</text>
            <text>关于我</text>
          </view>
        </view>

        <view class="tag-group">
          <view v-if="userData.incomeRange" class="info-tag">{{ userData.incomeRange }}</view>
          <view v-if="userData.housingStatus" class="info-tag">{{ userData.housingStatus }}</view>
          <view v-if="userData.carStatus" class="info-tag">{{ userData.carStatus }}</view>
          <view v-if="userData.maritalStatus" class="info-tag">{{ userData.maritalStatus }}</view>
          <view v-if="userData.isOnlyChild === 1" class="info-tag">独生子女</view>
          <view v-if="userData.marriagePlan" class="info-tag">{{ userData.marriagePlan }}</view>
        </view>

        <view v-if="userData.selfIntro" class="intro-content">
          <text class="intro-text" :class="{ collapsed: !showFullIntro }">{{ userData.selfIntro }}</text>
          <view v-if="introTooLong" class="expand-btn" @tap="showFullIntro = !showFullIntro">
            <text>{{ showFullIntro ? '收起' : '展开' }}</text>
          </view>
        </view>
      </view>

      <view v-if="userData.mateRequirement" class="requirement-section">
        <view class="section-header">
          <view class="section-title">
            <text class="heart-icon-small">💕</text>
            <text>择偶要求</text>
          </view>
        </view>

        <view class="intro-content">
          <text class="intro-text" :class="{ collapsed: !showFullRequirement }">{{ userData.mateRequirement }}</text>
          <view v-if="requirementTooLong" class="expand-btn" @tap="showFullRequirement = !showFullRequirement">
            <text>{{ showFullRequirement ? '收起' : '展开' }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-safe-area"></view>

      <view class="action-bar">
        <view class="action-btn primary-btn" @tap="handleChat">
          <text class="btn-icon">💬</text>
          <text>想认识Ta</text>
        </view>
        <view class="action-btn secondary-btn" @tap="showMatchmakerPopup">
          <text class="btn-icon">👁</text>
          <text>红娘牵线</text>
        </view>
      </view>

      <view v-if="showShare" class="share-panel">
        <view class="share-overlay" @tap="closeSharePanel"></view>
        <view class="share-content" :class="{ open: showShare }">
          <view class="share-option" @tap="shareToFriend">
            <text class="option-icon">💬</text>
            <text class="option-text">分享给好友</text>
          </view>
          <view class="share-divider"></view>
          <view class="share-option" @tap="generatePoster">
            <text class="option-icon">🖼</text>
            <text class="option-text">生成海报</text>
          </view>
        </view>
      </view>

      <matchmaker-popup
        :show="showMatchmaker"
        :matchmaker="selectedMatchmaker"
        @update:show="showMatchmaker = $event"
        @close="showMatchmaker = false"
        @more="showMatchmakerList"
      />

      <matchmaker-list-popup
        :show="showMatchmakerList"
        :matchmakers="matchmakerList"
        @update:show="showMatchmakerList = $event"
        @close="showMatchmakerList = false"
        @contact="onSelectMatchmaker"
      />
    </template>

    <view v-else class="empty-container">
      <text>用户不存在</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { request } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useSystemStore } from '@/stores/system'
import matchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import matchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'

interface PhotoItem {
  id?: number
  url: string
  sortOrder?: number
}

interface UserDetailData {
  id: number
  nickname: string
  avatar: string
  gender: number
  birthYear: number
  age: number
  height: number
  weight: number
  education: string
  occupation: string
  incomeRange: string
  housingStatus: string
  carStatus: string
  maritalStatus: string
  hometown: string
  residence: string
  selfIntro: string
  mateRequirement: string
  isRealName: number
  isVip: number
  isFollowed: boolean
  isSelf: boolean
  photos: PhotoItem[]
  zodiac?: string
  constellation?: string
  isOnlyChild?: number
  marriagePlan?: string
}

const userId = ref<number>(0)
const loading = ref(true)
const userData = ref<UserDetailData | null>(null)
const currentPhotoIndex = ref(0)
const showFullIntro = ref(false)
const showFullRequirement = ref(false)
const introTooLong = ref(false)
const requirementTooLong = ref(false)
const showShare = ref(false)
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

const userStore = useUserStore()
const systemStore = useSystemStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isVip = computed(() => userStore.isVip)

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any)?.options || {}

  if (options.id) {
    userId.value = parseInt(options.id)
    fetchUserDetail()
  } else {
    loading.value = false
  }

  fetchMatchmakerList()
})

const fetchUserDetail = async () => {
  try {
    loading.value = true
    const res = await request({
      url: `/users/${userId.value}`,
      method: 'GET',
    })

    userData.value = res.user || res

    if (userData.value.birthYear) {
      userData.value.zodiac = getZodiac(userData.value.birthYear)
      userData.value.constellation = getConstellation(userData.value.birthYear)
    }

    if (userData.value.selfIntro && userData.value.selfIntro.length > 150) {
      introTooLong.value = true
    }

    if (userData.value.mateRequirement && userData.value.mateRequirement.length > 150) {
      requirementTooLong.value = true
    }
  } catch (e) {
    console.error('fetch user detail error', e)
    uni.showToast({
      title: '获取用户信息失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

const fetchMatchmakerList = async () => {
  try {
    const res = await request({
      url: '/matchmakers',
      method: 'GET',
    })

    matchmakerList.value = res || []
  } catch (e) {
    console.error('fetch matchmaker list error', e)
  }
}

const getZodiac = (year: number): string => {
  const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
  return zodiacs[(year - 1900) % 12]
}

const getConstellation = (birthYear: number): string => {
  return '星座'
}

const handleBack = () => {
  uni.navigateBack()
}

const onPhotoChange = (e: any) => {
  currentPhotoIndex.value = e.detail.current
}

const previewPhoto = (index: number) => {
  if (!userData.value?.photos) return

  const urls = userData.value.photos.map((p) => p.url || p as string)
  uni.previewImage({
    current: index,
    urls,
  })
}

const showSharePanel = () => {
  showShare.value = true
}

const closeSharePanel = () => {
  showShare.value = false
}

const shareToFriend = async () => {
  closeSharePanel()

  const shareTitle = systemStore.config?.shareTitle || `${userData.value?.nickname} - 期待与你相遇`

  uni.showToast({
    title: '即将分享',
    icon: 'none',
  })
}

const generatePoster = () => {
  closeSharePanel()
  uni.navigateTo({
    url: `/pages/poster/index?userId=${userId.value}`,
  })
}

const toggleFollow = async () => {
  if (!isLoggedIn.value) {
    uni.showToast({
      title: '请先登录',
      icon: 'none',
    })
    return
  }

  if (!userData.value) return

  const isFollowed = userData.value.isFollowed
  const method = isFollowed ? 'DELETE' : 'POST'
  const actionText = isFollowed ? '取消关注' : '关注'

  try {
    await request({
      url: `/users/${userId.value}/follow`,
      method,
    })

    userData.value.isFollowed = !isFollowed

    uni.showToast({
      title: `${actionText}成功`,
      icon: 'success',
    })
  } catch (e) {
    console.error('toggle follow error', e)
    uni.showToast({
      title: `${actionText}失败`,
      icon: 'none',
    })
  }
}

const handleChat = () => {
  if (!isLoggedIn.value) {
    uni.showToast({
      title: '请先登录',
      icon: 'none',
    })
    return
  }

  if (!isVip.value) {
    uni.navigateTo({
      url: '/pages/vip/index',
    })
    return
  }

  uni.navigateTo({
    url: `/pages/chat/index?userId=${userId.value}&nickname=${userData.value?.nickname || ''}`,
  })
}

const showMatchmakerPopup = () => {
  if (matchmakerList.value.length > 0) {
    selectedMatchmaker.value = matchmakerList.value[0]
    showMatchmaker.value = true
  } else {
    uni.showToast({
      title: '暂无红娘信息',
      icon: 'none',
    })
  }
}

const showMatchmakerList = () => {
  showMatchmaker.value = false
  showMatchmakerList.value = true
}

const onSelectMatchmaker = (matchmaker: any) => {
  showMatchmakerList.value = false
  selectedMatchmaker.value = matchmaker
  setTimeout(() => {
    showMatchmaker.value = true
  }, 300)
}

const showAuthDetail = (type: string) => {
  let title = ''
  let content = ''

  switch (type) {
    case 'realname':
      title = '实名认证'
      content = userData.value?.isRealName ? '已通过实名认证' : '未认证'
      break
    case 'education':
      title = '学历认证'
      content = userData.value?.education || '未认证'
      break
    case 'housing':
      title = '房产认证'
      content = userData.value?.housingStatus || '未认证'
      break
    case 'car':
      title = '车辆认证'
      content = userData.value?.carStatus || '未认证'
      break
    case 'commitment':
      title = '单身承诺'
      content = '已签署单身承诺书'
      break
    case 'marital':
      title = '婚姻状况'
      content = userData.value?.maritalStatus || '未认证'
      break
  }

  uni.showModal({
    title,
    content,
    showCancel: false,
  })
}
</script>

<style lang="scss" scoped>
.user-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 180rpx;
}

.loading-container,
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 28rpx;
  color: #999;
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
  background-color: transparent;
  z-index: 100;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.more-icon {
  font-size: 40rpx;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.eye-icon {
  font-size: 32rpx;
}

.photo-section {
  position: relative;
  height: 45vh;
  background-color: #000;
}

.photo-swiper {
  width: 100%;
  height: 100%;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.share-btn {
  position: absolute;
  top: 120rpx;
  right: 32rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.share-icon {
  font-size: 36rpx;
  color: #fff;
}

.photo-thumbnails {
  position: absolute;
  left: 32rpx;
  bottom: 32rpx;
  display: flex;
  gap: 12rpx;
  z-index: 10;
}

.thumbnail-item {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  border: 4rpx solid transparent;
  overflow: hidden;
  opacity: 0.6;
  transition: all 0.2s;

  &.active {
    border-color: #FF6B9D;
    opacity: 1;
  }
}

.thumbnail-image {
  width: 100%;
  height: 100%;
}

.info-card {
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  margin-top: -24rpx;
  padding: 32rpx;
  position: relative;
  z-index: 20;
}

.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.name-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.user-name {
  font-size: 40rpx;
  font-weight: bold;
  color: var(--text, #333);
}

.id-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.id-label {
  font-size: 20rpx;
  color: #999;
}

.id-value {
  font-size: 20rpx;
  color: #666;
}

.follow-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: #FFF0F3;
  border-radius: 32rpx;
}

.heart-icon {
  font-size: 32rpx;
}

.follow-text {
  font-size: 24rpx;
  color: #FF6B9D;
}

.basic-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.dot {
  margin: 0 8rpx;
  color: #ddd;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
}

.pink-tag {
  background-color: #FFF0F3;
  color: #FF6B9D;
}

.blue-tag {
  background-color: #EEF4FF;
  color: #4A90E2;
}

.tag-icon {
  font-size: 24rpx;
}

.address-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.address-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.address-icon {
  font-size: 28rpx;
}

.address-icon.blue {
  color: #4A90E2;
}

.address-icon.orange {
  color: #FF9500;
}

.address-label {
  font-size: 24rpx;
  color: #999;
}

.address-value {
  font-size: 24rpx;
  color: var(--text, #333);
}

.auth-section {
  background-color: #fff;
  padding: 24rpx 32rpx;
  margin-top: 16rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--text, #333);
}

.shield-icon,
.book-icon,
.heart-icon-small {
  font-size: 32rpx;
}

.auth-tip {
  font-size: 24rpx;
  color: #999;
}

.auth-scroll {
  white-space: nowrap;
}

.auth-items {
  display: flex;
  gap: 32rpx;
  padding: 8rpx 0;
}

.auth-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.auth-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #fff;

  &.verified {
    background-color: #4A90E2;
  }
}

.auth-label {
  font-size: 24rpx;
  color: #666;
}

.about-section,
.requirement-section {
  background-color: #fff;
  padding: 24rpx 32rpx;
  margin-top: 16rpx;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.info-tag {
  padding: 8rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #666;
}

.intro-content {
  position: relative;
}

.intro-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;

  &.collapsed {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    overflow: hidden;
  }
}

.expand-btn {
  text-align: right;
  margin-top: 12rpx;

  text {
    font-size: 26rpx;
    color: #FF6B9D;
  }
}

.bottom-safe-area {
  height: 120rpx;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.action-btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 48rpx;
  font-size: 30rpx;
  font-weight: bold;
}

.primary-btn {
  background-color: #FF6B9D;
  color: #fff;
}

.secondary-btn {
  background-color: #722ED1;
  color: #fff;
}

.btn-icon {
  font-size: 32rpx;
}

.share-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.share-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.share-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 48rpx 32rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s ease-out;

  &.open {
    transform: translateY(0);
  }
}

.share-option {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
}

.option-icon {
  font-size: 48rpx;
}

.option-text {
  font-size: 30rpx;
  color: var(--text, #333);
}

.share-divider {
  height: 1rpx;
  background-color: #eee;
}
</style>
