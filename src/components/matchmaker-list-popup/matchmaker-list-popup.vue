<template>
  <view v-show="visible" class="matchmaker-list-popup">
    <view class="overlay" @tap="handleClose"></view>
    <view class="popup-panel" :class="{ open: visible }">
      <view class="panel-header">
        <text class="header-title">选择红娘</text>
        <view class="close-btn" @tap="handleClose">
          <text>X</text>
        </view>
      </view>

      <scroll-view class="list-container" scroll-y>
        <view
          v-for="(item, index) in matchmakers"
          :key="item.id"
          class="list-item"
          @tap="handleSelect(item)"
        >
          <view class="item-content">
            <image class="avatar" :src="getAvatarUrl(item.avatar)" mode="aspectFill" @error="onAvatarError(item.avatar)" />
            <view class="info">
              <view class="name">{{ item.name }}</view>
              <view class="title">{{ item.title }}</view>
            </view>
            <view class="contact-btn" @tap.stop="handleContact(item)">
              <text>联系红娘</text>
            </view>
          </view>
          <view v-if="index < matchmakers.length - 1" class="divider"></view>
        </view>

        <view v-if="matchmakers.length === 0" class="empty-tip">
          <text>暂无红娘信息</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { MatchmakerData } from '../matchmaker-popup/matchmaker-popup.vue'

interface Props {
  show: boolean
  matchmakers: MatchmakerData[]
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
  (e: 'select', matchmaker: MatchmakerData): void
  (e: 'contact', matchmaker: MatchmakerData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = ref(false)
const failedAvatars = ref<Record<string, true>>({})

const getAvatarUrl = (avatar: string) => {
  if (failedAvatars.value[avatar]) return '/static/default-avatar.png'
  return avatar || '/static/default-avatar.png'
}

const onAvatarError = (avatar: string) => {
  if (avatar) {
    failedAvatars.value = { ...failedAvatars.value, [avatar]: true }
  }
}

watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal
  },
  { immediate: true }
)

const handleClose = () => {
  visible.value = false
  emit('update:show', false)
  emit('close')
}

const handleSelect = (item: MatchmakerData) => {
  emit('select', item)
}

const handleContact = (item: MatchmakerData) => {
  emit('contact', item)
}

const open = (matchmakers: MatchmakerData[]) => {
  visible.value = true
}

const close = () => {
  handleClose()
}

defineExpose({
  open,
  close,
})
</script>

<style lang="scss" scoped>
.matchmaker-list-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
}

.popup-panel {
  position: relative;
  height: 70vh;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;

  &.open {
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 100rpx;
  border-bottom: 1rpx solid #eee;
  flex-shrink: 0;
}

.header-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--text, #333);
}

.close-btn {
  position: absolute;
  top: 50%;
  right: 32rpx;
  transform: translateY(-50%);
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 36rpx;
}

.list-container {
  flex: 1;
  overflow-y: auto;
}

.list-item {
  padding: 24rpx 32rpx;
}

.item-content {
  display: flex;
  align-items: center;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.info {
  flex: 1;
  margin-left: 24rpx;
}

.name {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--text, #333);
  margin-bottom: 8rpx;
}

.title {
  font-size: 24rpx;
  color: #999;
}

.contact-btn {
  padding: 12rpx 24rpx;
  background-color: #FF6B9D;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #fff;
  flex-shrink: 0;
}

.divider {
  height: 1rpx;
  background-color: #EEEEEE;
  margin-top: 24rpx;
}

.empty-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  font-size: 28rpx;
  color: #999;
}
</style>
