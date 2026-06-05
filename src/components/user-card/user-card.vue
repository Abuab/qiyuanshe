<template>
  <view class="user-card" @tap="handleClick">
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

    <view class="card-right">
      <!-- 第一行：昵称 + 实名 + 年龄 -->
      <view class="user-header">
        <text class="nickname">{{ user.nickname }}</text>
        <view v-if="user.isRealName" class="real-name-badge">已实名</view>
        <text v-if="user.age" class="age-text">{{ user.age }}岁</text>
      </view>

      <!-- 第二行：标签行（两行紧凑展示） -->
      <view class="tags-area">
        <!-- 第一行标签：年龄、身高、学历（带彩色背景） -->
        <view class="tags-line tags-line-1">
          <text v-if="user.age" class="tag-badge tag-age">{{ user.age }}岁</text>
          <text v-if="user.height" class="tag-badge tag-height">{{ user.height }}cm</text>
          <text v-if="user.education" class="tag-badge tag-edu">{{ user.education }}</text>
        </view>
        <!-- 第二行标签：购房、工作、收入（用圆点分隔） -->
        <view v-if="user.housingStatus || user.occupation || user.incomeRange" class="tags-line tags-line-2">
          <text v-if="user.housingStatus" class="tag-dot-text">{{ user.housingStatus }}</text>
          <text v-if="user.occupation" class="tag-dot-text">{{ user.occupation }}</text>
          <text v-if="user.incomeRange" class="tag-dot-text">{{ user.incomeRange }}</text>
        </view>
      </view>

      <!-- 第三行：位置 + 红娘评语（如果有） -->
      <view class="meta-row">
        <text v-if="user.residence || user.city" class="loc-text">📍 {{ user.residence || user.city }}</text>
        <text v-if="user.matchmakerComment" class="mk-brief">{{ user.matchmakerComment }}</text>
      </view>

      <!-- 第四行：个人简介（如果有） -->
      <view v-if="displayIntro" class="intro-row">
        <text class="intro-text">{{ displayIntro }}</text>
      </view>

      <!-- 照片缩略图 - 横向排列在信息下方 -->
      <view v-if="showPhotos && user.photos && user.photos.length > 0" class="photos-row">
        <image
          v-for="(photo, index) in displayPhotos"
          :key="index"
          class="photo-thumb"
          :src="photo"
          mode="aspectFill"
          @error="onPhotoError(props.user.photos![index])"
          lazy-load
        ></image>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'

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
  photos?: string[]
  selfIntro?: string
  bio?: string
  residence?: string
  city?: string
  matchmakerComment?: string
  mateRequirements?: string
  gender?: number
}

interface Props {
  user: UserCardData
  showPhotos?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showPhotos: true,
})

const emit = defineEmits<{
  (e: 'click', user: UserCardData): void
}>()

const avatarError = ref(false)
const photoFailedMap = ref<Record<string, true>>({})

const avatarUrl = computed(() => {
  if (avatarError.value) return icons.common.defaultAvatar
  const avatar = props.user.avatar
  if (!avatar) return icons.common.defaultAvatar
  if (avatar.startsWith('http') || avatar.startsWith('/static/')) return avatar
  return getFullImageUrl(avatar)
})

const displayIntro = computed(() => {
  const t = props.user.selfIntro || props.user.bio
  return t ? (t.length > 60 ? t.slice(0, 60) + '...' : t) : ''
})

const onAvatarError = () => {
  avatarError.value = true
}

const onPhotoError = (photoUrl: string) => {
  if (photoUrl) {
    photoFailedMap.value = { ...photoFailedMap.value, [photoUrl]: true }
  }
}

const displayPhotos = computed(() => {
  if (!props.user.photos || props.user.photos.length === 0) return []
  return props.user.photos.slice(0, 4).map(photo => {
    if (photoFailedMap.value[photo]) return icons.common.defaultAvatar
    if (photo.startsWith('http') || photo.startsWith('/static/')) return photo
    return getFullImageUrl(photo)
  })
})

const handleClick = () => {
  emit('click', props.user)
}
</script>

<style lang="scss" scoped>
.user-card {
  display: flex;
  padding: 20rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  align-items: flex-start;

  &:active {
    background-color: #f9f9f9;
  }
}

.card-left {
  flex-shrink: 0;
  margin-right: 20rpx;
  position: relative;
  align-self: flex-start;
}

.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.gender-badge {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  .gender-text {
    font-size: 20rpx;
    color: #fff;
  }

  &.male {
    background: #2979ff;
  }

  &.female {
    background: #FF6B9D;
  }
}

.card-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

// 第一行：昵称 + 实名 + 年龄
.user-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.nickname {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  max-width: 160rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.real-name-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  font-size: 20rpx;
  color: #1890ff;
  background-color: #e6f7ff;
  border-radius: 4rpx;
  line-height: 1.6;
}

.age-text {
  font-size: 26rpx;
  color: #999;
  flex-shrink: 0;
  margin-left: auto;
}

// 第二行：标签行（两行紧凑展示）
.tags-area {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tags-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10rpx;
}

// 第一行彩色标签
.tag-badge {
  font-size: 22rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  line-height: 1.6;
  flex-shrink: 0;

  &.tag-age {
    color: #FF6B9D;
    background-color: #FFF0F5;
  }

  &.tag-height {
    color: #909399;
    background-color: #F4F4F5;
  }

  &.tag-edu {
    color: #409EFF;
    background-color: #ECF5FF;
  }
}

// 第二行圆点分隔文字
.tags-line-2 {
  gap: 0;
}

.tag-dot-text {
  font-size: 22rpx;
  color: #999;

  &:not(:first-child)::before {
    content: '·';
    color: #ddd;
    margin: 0 6rpx;
  }
}

// 第三行：位置 + 红娘评语
.meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  overflow: hidden;
}

.loc-text {
  font-size: 22rpx;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
}

.mk-brief {
  font-size: 22rpx;
  color: #FF9500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 第四行：简介
.intro-row {
  .intro-text {
    font-size: 24rpx;
    color: #999;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// 照片缩略图
.photos-row {
  display: flex;
  gap: 10rpx;
  flex-wrap: nowrap;
  overflow: hidden;
  margin-top: 2rpx;
}

.photo-thumb {
  width: 100rpx;
  height: 100rpx;
  border-radius: 8rpx;
  background-color: #f5f5f5;
  flex-shrink: 0;
}
</style>
