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
        <text>{{ user.gender === 1 ? '♂' : '♀' }}</text>
      </view>
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

      <view v-if="user.residence || user.city" class="loc-row">
        <text class="loc-text">📍 {{ user.residence || user.city }}</text>
      </view>

      <view v-if="user.matchmakerComment" class="mk-row">
        <view class="mk-hd">
          <image class="mk-icon" :src="icons.quickEntry.matchmakerComment" mode="aspectFit" />
          <text>红娘评语</text>
        </view>
        <text class="mk-txt">{{ user.matchmakerComment }}</text>
      </view>

      <view v-if="user.mateRequirements" class="mate-row">
        <text class="mate-lb">择偶要求：</text><text class="mate-val">{{ user.mateRequirements }}</text>
      </view>

      <view v-if="displayIntro" class="intro-row">
        <text>{{ displayIntro }}</text>
      </view>

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
  position: relative;
}

.avatar {
  width: 200rpx;
  height: 240rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.gender-badge {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 22rpx;
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
}

.loc-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;

  .loc-text {
    font-size: 24rpx;
    color: var(--text-secondary);
  }
}

.mk-row {
  background: #FFF8F0;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;

  .mk-hd {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 8rpx;

    .mk-icon {
      width: 32rpx;
      height: 32rpx;
    }

    text {
      font-size: 24rpx;
      color: #FF9500;
      font-weight: bold;
    }
  }

  .mk-txt {
    font-size: 26rpx;
    color: #666;
    line-height: 1.5;
  }
}

.mate-row {
  margin-bottom: 12rpx;

  .mate-lb {
    font-size: 24rpx;
    color: #FF6B9D;
    font-weight: bold;
  }

  .mate-val {
    font-size: 24rpx;
    color: #666;
  }
}

.intro-row {
  margin-bottom: 12rpx;

  text {
    font-size: 26rpx;
    color: #666;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.photos-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.photo-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  background-color: #f5f5f5;
}
</style>
