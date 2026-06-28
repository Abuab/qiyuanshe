<template>
  <view class="user-list-section">
    <user-card
      v-for="user in users"
      :key="user.id"
      :user="user"
      @click="$emit('user-click', user)"
    />

    <view v-if="loadingMore" class="loading-more">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-if="noMore && users.length > 0" class="no-more-data">
      <text class="no-more-text">没有更多了</text>
    </view>

    <view v-if="users.length === 0 && !loadingMore" class="empty-list">
      <text class="empty-text">{{ emptyText }}</text>
      <view v-if="showClearFilter" class="clear-filter-btn" @tap="$emit('clear-filter')">
        <text>清除筛选</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import UserCard from '@/components/user-card/user-card.vue'
import type { UserCardData } from '@/components/user-card/user-card.vue'

interface Props {
  users: UserCardData[]
  loadingMore?: boolean
  noMore?: boolean
  emptyText?: string
  showClearFilter?: boolean
}

withDefaults(defineProps<Props>(), {
  loadingMore: false,
  noMore: false,
  emptyText: '暂无匹配用户',
  showClearFilter: false,
})

defineEmits<{
  (e: 'user-click', user: UserCardData): void
  (e: 'clear-filter'): void
}>()
</script>

<style lang="scss" scoped>
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
  padding: 20rpx 0;
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
</style>
