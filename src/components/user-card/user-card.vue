<template>
  <view class="user-card" @tap="handleClick" :style="{ position: 'relative' }">
    <!-- 左列：仅头像 -->
    <view class="card-left">
      <image
        class="avatar"
        :src="avatarUrl"
        mode="aspectFill"
        @error="onAvatarError"
        lazy-load
      ></image>
      <view v-if="user.gender" class="gender-badge" :class="user.gender === 1 ? 'male' : 'female'">
        <text class="gender-text">{{ user.gender === 1 ? '♂' : '♀' }}</text>
      </view>
    </view>

    <!-- 右列：昵称、标签、简介、相册小图 -->
    <view class="card-right">
      <view class="user-header">
        <view class="name-section">
          <text class="nickname">{{ user.nickname }}</text>
          <text v-if="user.gender" class="gender-tag" :class="user.gender === 1 ? 'male' : 'female'">
            {{ user.gender === 1 ? '♂男' : '♀女' }}
          </text>
          <view v-if="user.isRealName" class="real-name-badge">
            <image v-if="realNameIcon" class="real-name-icon-img" :src="realNameIcon" mode="aspectFit" />
            <text>已实名</text>
          </view>
        </view>
        <view v-if="matchBadgeText" class="match-badge" :class="{ untested: viewerUntested }">
          <text class="match-badge-text">{{ matchBadgeText }}</text>
        </view>
      </view>

      <view class="tags-area">
        <view class="tags-line tags-line-1">
          <text v-if="user.age" class="tag-badge tag-age">{{ user.age }}岁</text>
          <text v-if="user.height" class="tag-badge tag-height">{{ user.height }}cm</text>
          <text v-if="user.education" class="tag-badge tag-edu">{{ user.education }}</text>
          <text v-if="voiceEnabled && user.hasVoice" class="tag-badge tag-voice">语音</text>
        </view>
        <view v-if="computedSecondLine.length > 0" class="tags-line tags-line-2">
          <text class="tag-dot-text">{{ computedSecondLine.join(' · ') }}</text>
        </view>
      </view>

      <view class="meta-row">
        <text v-if="user.residence || user.city" class="loc-text">📍 {{ (user.residence || user.city || '').replace(/\//g, ',') }}</text>
        <text v-if="user.matchmakerComment" class="mk-brief">{{ user.matchmakerComment }}</text>
      </view>

      <view v-if="displayIntro" class="intro-row">
        <text class="intro-text">{{ displayIntro }}</text>
      </view>

      <!-- 相册小图：右列内部，与上方文字共享同一左边缘 -->
      <view v-if="showPhotos && displayPhotos.length > 0" class="photos-row">
        <view
          v-for="(photo, index) in displayPhotos"
          :key="index"
          class="photo-thumb-wrapper"
          :class="{ 'photo-blur-wrapper': needBlurPhotos }"
        >
          <image
            class="photo-thumb"
            :class="{ 'photo-blur': needBlurPhotos }"
            :src="photo"
            mode="aspectFill"
            @error="onPhotoError(displayPhotos[index])"
            lazy-load
          ></image>
        </view>
      </view>
    </view>

    <!-- 心动按钮：用 Unicode 心形替代 uni-icons 图标字体，避免真机字体不渲染 -->
    <view class="heart-btn" :class="{ liked: isLiked }" @tap.stop="onLike">
      <text class="heart-ico">{{ isLiked ? '♥' : '♡' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { useIcon } from '@/composables/useIcon'
import { useSystemStore } from '@/store/system'

export interface UserCardData {
  id: number
  nickname: string
  avatar?: string
  age?: number
  height?: number
  education?: string
  occupation?: string
  incomeRange?: string
  housingStatus?: string
  isRealName?: boolean
  isLiked?: boolean
  photos?: string[]
  residence?: string
  city?: string
  matchmakerComment?: string
  mateRequirements?: string
  gender?: number
  hasVoice?: boolean
}

interface Props {
  user: UserCardData
  showPhotos?: boolean
  /** 当前浏览者与该用户的人格匹配度（0~100），已测试用户可见 */
  matchPercent?: number
  /** 当前浏览者尚未测试人格，展示引导文案 */
  viewerUntested?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showPhotos: true,
})

const emit = defineEmits<{
  (e: 'click', user: UserCardData): void
}>()

const { getPageIcon } = useIcon()
const avatarError = ref(false)
const photoFailedMap = ref<Record<string, true>>({})

const realNameIcon = computed(() => {
  return getPageIcon('realNameIcon') || ''
})

const computedSecondLine = computed(() => {
  const parts: string[] = []
  if (props.user.housingStatus) parts.push(props.user.housingStatus)
  if (props.user.occupation) parts.push(props.user.occupation)
  if (props.user.incomeRange) parts.push(props.user.incomeRange)
  return parts
})

const store = useSystemStore()
const defaultAvatar = computed(() => store.defaultAvatar || icons.common.defaultAvatar)

const avatarUrl = computed(() => {
  if (avatarError.value) return defaultAvatar.value
  const avatar = props.user.avatar
  if (!avatar) return defaultAvatar.value
  if (avatar.startsWith('http') || avatar.startsWith('/static/')) return avatar
  return getFullImageUrl(avatar)
})

const displayIntro = computed(() => '')

/** 人格匹配度标识文案：已测且有分显示百分比，未测显示引导文案 */
const matchBadgeText = computed(() => {
  if (props.viewerUntested) return '测一测更精准'
  if (typeof props.matchPercent === 'number' && props.matchPercent > 0) {
    return `性格匹配度 ${props.matchPercent}%`
  }
  return ''
})

const onAvatarError = () => {
  avatarError.value = true
}

const onPhotoError = (photoUrl: string) => {
  if (photoUrl) {
    photoFailedMap.value = { ...photoFailedMap.value, [photoUrl]: true }
  }
}

const resolvePhotoUrl = (raw: string): string => {
  if (photoFailedMap.value[raw]) return defaultAvatar.value
  if (raw.startsWith('http') || raw.startsWith('/static/')) return raw
  return getFullImageUrl(raw)
}

const displayPhotos = computed(() => {
  const photos = props.user.photos
  if (photos && photos.length > 0) {
    return photos.slice(0, 4).map(resolvePhotoUrl)
  }
  // photos 为空但有头像时，用头像兜底展示一张
  if (props.user.avatar) {
    return [resolvePhotoUrl(props.user.avatar)]
  }
  return []
})

/** 该用户有多张照片时全部模糊，仅一张时清晰展示 */
const needBlurPhotos = computed(() => displayPhotos.value.length > 1)

const handleClick = () => {
  emit('click', props.user)
}

// ===== 心动按钮 =====
const isLiked = ref(props.user?.isLiked || false)
const voiceEnabled = ref(false)

onMounted(async () => {
  try {
    const res: any = await request({ url: '/system/config?key=feature.voiceEnabled', method: 'GET' })
    voiceEnabled.value = res?.value !== 'false'
  } catch { voiceEnabled.value = false }
})

const onLike = async () => {
  if (isLiked.value) {
    try {
      const res: any = await request({ url: `/users/${props.user.id}/like`, method: 'DELETE' })
      isLiked.value = false
      void res
    } catch {
      uni.showToast({ title: '操作失败', icon: 'none' })
    }
    return
  }

  try {
    const res: any = await request({ url: `/users/${props.user.id}/like`, method: 'POST' })
    isLiked.value = true
    if (res?.isMatched && res.matchUser) {
      uni.$emit('match:success', res.matchUser)
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.user-card {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 10rpx 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
  position: relative;
}

/* ======== 左列 ======== */
.card-left {
  flex-shrink: 0;
  margin-right: 14rpx;
  position: relative;
}

.avatar {
  display: block;
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.gender-badge {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gender-badge.male { background: #2979ff; }
.gender-badge.female { background: #FF6B9D; }
.gender-text { font-size: 22rpx; color: #fff; }

/* ======== 右列 ======== */
.card-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.user-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rpx;
}

.name-section {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.nickname {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.gender-tag {
  font-size: 22rpx;
  font-weight: bold;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  margin-left: 6rpx;
}
.gender-tag.male { color: #fff; background: #2979ff; }
.gender-tag.female { color: #fff; background: #FF6B9D; }

.real-name-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 2rpx 10rpx;
  font-size: 20rpx;
  color: #1890ff;
  background-color: #e6f7ff;
  border-radius: 20rpx;
  line-height: 1.6;
  margin-left: 6rpx;
}

.real-name-icon-img {
  width: 24rpx;
  height: 24rpx;
  margin-right: 4rpx;
}

/* --- 标签区 --- */
.tags-area {
  display: flex;
  flex-direction: column;
  margin-bottom: 2rpx;
}

.tags-line-1 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 2rpx;
}

.tags-line-2 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.tag-badge {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  margin-right: 8rpx;
}

.tag-age { color: #FF6B9D; background-color: #FFF0F5; }
.tag-height { color: #909399; background-color: #F4F4F5; }
.tag-edu { color: #409EFF; background-color: #ECF5FF; }
.tag-voice { color: #FF9500; background-color: #FFF7E6; margin-right: 0; }

.tag-dot-text {
  font-size: 22rpx;
  color: #666;
}

/* --- 位置 --- */
.meta-row {
  display: flex;
  align-items: center;
  margin-bottom: 2rpx;
}

.loc-text {
  font-size: 22rpx;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.mk-brief {
  font-size: 22rpx;
  color: #FF9500;
  white-space: nowrap;
}

/* --- 人格匹配度标识 --- */
.match-badge {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  background: linear-gradient(90deg, #FFE8CC 0%, #FFD9C0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
}

.match-badge.untested {
  background: #FFF0F5;
}

.match-badge-text {
  font-size: 20rpx;
  color: #E8792B;
  text-align: center;
  line-height: 1.4;
}

.match-badge.untested .match-badge-text {
  color: #FF6B9D;
}

/* --- 相册小图 --- */
.photos-row {
  display: flex;
  flex-wrap: nowrap;
}

.photo-thumb-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  overflow: hidden;
  margin-right: 20rpx;
  margin-bottom: 8rpx;
  background-color: #f5f5f5;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.photo-thumb {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 0;
}

.photo-thumb.photo-blur {
  filter: blur(3px) brightness(0.9);
  transform: scale(1.08);
}

/* ===== 心动按钮 ===== */
.heart-btn {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 300ms ease;
  z-index: 2;
}

.heart-btn.liked {
  animation: heartBounce 300ms ease;
}

.heart-ico {
  font-size: 44rpx;
  line-height: 1;
  color: #FF6B6B;
}

@keyframes heartBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
</style>
