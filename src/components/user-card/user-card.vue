<template>
  <view class="user-card" @tap="handleClick">
    <view class="card-left">
      <image
        class="avatar"
        :src="avatarUrl"
        mode="aspectFill"
        @error="onAvatarError"
      ></image>
    </view>

    <view class="card-right">
      <view class="user-header">
        <text class="nickname">{{ user.nickname }}</text>
        <view v-if="user.isRealName" class="real-name-badge">已实名</view>
      </view>

      <view class="tags-row">
        <view class="tag age-tag">{{ user.age }}岁</view>
        <view class="tag height-tag">{{ user.height }}cm</view>
        <view v-if="user.education" class="tag education-tag">{{ user.education }}</view>
      </view>

      <view class="info-row">
        <text v-if="user.housingStatus" class="info-text">{{ user.housingStatus }}</text>
        <text v-if="user.occupation" class="info-text">{{ user.occupation }}</text>
        <text v-if="user.incomeRange" class="info-text">{{ user.incomeRange }}</text>
      </view>

      <view v-if="showPhotos && user.photos && user.photos.length > 0" class="photos-row">
        <image
          v-for="(photo, index) in displayPhotos"
          :key="index"
          class="photo-thumb"
          :src="photo"
          mode="aspectFill"
          @error="onPhotoError(props.user.photos![index])"
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
  // 对于本地路径直接返回，相对路径拼接完整 URL
  if (avatar.startsWith('http') || avatar.startsWith('/static/')) return avatar
  return getFullImageUrl(avatar)
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
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;

  &:active {
    background-color: #f9f9f9;
  }
}

.card-left {
  flex-shrink: 0;
  margin-right: 24rpx;
}

.avatar {
  width: 200rpx;
  height: 240rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.card-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.user-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.nickname {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--text);
  margin-right: 12rpx;
}

.real-name-badge {
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: #1890ff;
  background-color: #e6f7ff;
  border-radius: 4rpx;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.tag {
  padding: 6rpx 16rpx;
  font-size: 22rpx;
  border-radius: 6rpx;
}

.age-tag {
  color: #1890ff;
  background-color: #e6f7ff;
}

.height-tag {
  color: #722ed1;
  background-color: #f9f0ff;
}

.education-tag {
  color: #8c8c8c;
  background-color: #f5f5f5;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.info-text {
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-right: 12rpx;
}

.photos-row {
  display: flex;
  gap: 12rpx;
}

.photo-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background-color: #f5f5f5;
}
</style>
