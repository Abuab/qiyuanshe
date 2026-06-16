<template>
  <view class="user-card" @tap="handleClick">
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
        </view>
        <view v-if="user.isRealName" class="real-name-badge">已实名</view>
        <text v-if="user.age" class="age-text">{{ user.age }}岁</text>
      </view>

      <view class="tags-area">
        <view class="tags-line tags-line-1">
          <text v-if="user.age" class="tag-badge tag-age">{{ user.age }}岁</text>
          <text v-if="user.height" class="tag-badge tag-height">{{ user.height }}cm</text>
          <text v-if="user.education" class="tag-badge tag-edu">{{ user.education }}</text>
        </view>
        <view v-if="user.housingStatus || user.occupation || user.incomeRange" class="tags-line tags-line-2">
          <text v-if="user.housingStatus" class="tag-dot-text">{{ user.housingStatus }}</text>
          <text v-if="user.occupation" class="tag-dot-text">{{ user.occupation }}</text>
          <text v-if="user.incomeRange" class="tag-dot-text">{{ user.incomeRange }}</text>
        </view>
      </view>

      <view class="meta-row">
        <text v-if="user.residence || user.city" class="loc-text">📍 {{ user.residence || user.city }}</text>
        <text v-if="user.matchmakerComment" class="mk-brief">{{ user.matchmakerComment }}</text>
      </view>

      <view v-if="displayIntro" class="intro-row">
        <text class="intro-text">{{ displayIntro }}</text>
      </view>

      <!-- 相册小图：右列内部，与上方文字共享同一左边缘 -->
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

const displayIntro = computed(() => '')

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
  flex-direction: row;
  align-items: flex-start;
  padding: 10rpx 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
}

/* ======== 左列 ======== */
.card-left {
  flex-shrink: 0;
  margin-right: 14rpx;
  position: relative;
}

.avatar {
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
}

.user-header {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
}

.name-section {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  max-width: 60%;
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

.gender-tag {
  font-size: 24rpx;
  font-weight: bold;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  margin-left: 8rpx;
}
.gender-tag.male { color: #fff; background: #2979ff; }
.gender-tag.female { color: #fff; background: #FF6B9D; }

.real-name-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  font-size: 20rpx;
  color: #1890ff;
  background-color: #e6f7ff;
  border-radius: 4rpx;
  line-height: 1.6;
  margin-left: 10rpx;
}

.age-text {
  font-size: 26rpx;
  color: #999;
  flex-shrink: 0;
  margin-left: auto;
}

/* --- 标签区 --- */
.tags-area {
  display: flex;
  flex-direction: column;
  margin-bottom: 4rpx;
}

.tags-line-1 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 4rpx;
}

.tags-line-2 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.tag-badge {
  font-size: 22rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  margin-right: 10rpx;
}

.tag-age { color: #FF6B9D; background-color: #FFF0F5; }
.tag-height { color: #909399; background-color: #F4F4F5; }
.tag-edu { color: #409EFF; background-color: #ECF5FF; margin-right: 0; }

.tag-dot-text {
  font-size: 22rpx;
  color: #999;
  margin-right: 12rpx;
}

/* --- 位置 --- */
.meta-row {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
}

.loc-text {
  font-size: 22rpx;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.mk-brief {
  font-size: 22rpx;
  color: #FF9500;
  white-space: nowrap;
}

/* --- 相册小图 --- */
.photos-row {
  display: flex;
  flex-wrap: nowrap;
}

.photo-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background-color: #f5f5f5;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
}
</style>
