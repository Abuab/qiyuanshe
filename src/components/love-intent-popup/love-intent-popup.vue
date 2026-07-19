<template>
  <!-- 遮罩层：65% 黑色半透明，点击不关闭 -->
  <view v-if="visible" class="lip-overlay">
    <!-- 弹窗卡片 -->
    <view class="lip-card">
      <!-- 标题 -->
      <text class="lip-title">脱单需求确认</text>

      <!-- 正文 -->
      <text class="lip-body">您当前脱单意向未明确，账号已锁定，若要解锁，请确认您有脱单意向。相亲编号：{{ userId }}</text>

      <!-- 底部按钮区 -->
      <view class="lip-btn-area">
        <view class="lip-btn lip-btn-left" @tap="handleNoNeed">
          <text>已脱单，无需求</text>
        </view>
        <view class="lip-btn-divider"></view>
        <view class="lip-btn lip-btn-right" @tap="handleSingle">
          <text>单身，有脱单需求</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  userId: string
}>()

const emit = defineEmits<{
  'no-need': []
  'single': []
}>()

const handleNoNeed = () => {
  emit('no-need')
}

const handleSingle = () => {
  emit('single')
}
</script>

<style lang="scss" scoped>
.lip-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lip-card {
  width: 80%;
  background: #ffffff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lip-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #000000;
  text-align: center;
  margin-top: 40rpx;
}

.lip-body {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
  text-align: center;
  padding: 36rpx 40rpx 0 40rpx;
}

.lip-btn-area {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: stretch;
  margin-top: 40rpx;
  border-top: 1px solid #EEEEEE;
}

.lip-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    font-weight: normal;
  }
}

.lip-btn-left {
  text {
    color: #333333;
  }

  &:active {
    background: #f5f5f5;
  }
}

.lip-btn-divider {
  width: 1px;
  background: #EEEEEE;
}

.lip-btn-right {
  text {
    color: #FF6B9D;
  }

  &:active {
    background: #fff0f3;
  }
}
</style>
