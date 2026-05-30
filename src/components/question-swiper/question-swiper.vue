<template>
  <view class="question-swiper">
    <scroll-view
      class="swiper-container"
      scroll-x
      :show-scrollbar="false"
    >
      <view
        v-for="question in questions"
        :key="question.id"
        class="question-card"
        @tap="goToDetail(question)"
      >
        <view class="card-content">
          <text class="question-title"># {{ question.title }}</text>
          <view class="avatars-row">
            <image
              v-for="(avatar, index) in question.recentAvatars.slice(0, 3)"
              :key="index"
              class="avatar"
              :src="avatar"
              mode="aspectFill"
            />
            <text v-if="question.answerCount > 3" class="more-count">+{{ question.answerCount - 3 }}</text>
          </view>
        </view>
        <view class="more-arrow">
          <text>更多 ></text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

interface Question {
  id: number
  title: string
  answerCount: number
  recentAvatars: string[]
}

const questions = ref<Question[]>([])

onMounted(() => {
  fetchQuestions()
})

const fetchQuestions = async () => {
  try {
    const res = await request({
      url: '/questions',
      method: 'GET',
      data: {
        page: 1,
        limit: 5,
      },
    })

    const list = Array.isArray(res) ? res : (res.list || [])

    questions.value = list.map((q: any) => ({
      id: q.id,
      title: q.title,
      answerCount: q.answerCount || 0,
      recentAvatars: q.recentAvatars || [],
    }))
  } catch (e) {
    console.error('fetch questions error', e)
  }
}

const goToDetail = (question: Question) => {
  uni.navigateTo({
    url: `/pages/question-detail/index?id=${question.id}&title=${encodeURIComponent(question.title)}`,
  })
}
</script>

<style lang="scss" scoped>
.question-swiper {
  padding: 20rpx 0;
}

.swiper-container {
  display: flex;
  white-space: nowrap;
  padding: 0 24rpx;
}

.question-card {
  display: inline-flex;
  flex-direction: column;
  width: 400rpx;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-right: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-content {
  margin-bottom: 16rpx;
}

.question-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatars-row {
  display: flex;
  align-items: center;
}

.avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-left: -16rpx;

  &:first-child {
    margin-left: 0;
  }
}

.more-count {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}

.more-arrow {
  text-align: right;

  text {
    font-size: 24rpx;
    color: #FF6B9D;
  }
}
</style>
