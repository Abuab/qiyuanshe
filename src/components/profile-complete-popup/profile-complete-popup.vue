<template>
  <!-- 遮罩层 -->
  <view v-if="show" class="pcp-overlay" @tap="handleMaskClick">
    <!-- 弹窗卡片（阻止冒泡） -->
    <view class="pcp-card" @tap.stop>
      <!-- 插画区 -->
      <view class="pcp-illustration">
        <!-- 装饰元素 -->
        <!-- 左上：紫色 × -->
        <text class="pcp-deco pcp-deco-x">×</text>
        <!-- 左下：粉色菱形 -->
        <view class="pcp-deco pcp-deco-diamond" />
        <!-- 右上：黄色四角星 -->
        <text class="pcp-deco pcp-deco-star">✦</text>
        <!-- 右下：黄色空心圆环 -->
        <view class="pcp-deco pcp-deco-ring" />

        <!-- 中央文件图标 -->
        <view class="pcp-file-icon">
          <!-- 黄色圆形头像 -->
          <view class="pcp-file-avatar" />
          <!-- 用户名占位线 -->
          <view class="pcp-file-line" style="width: 32px; margin-top: 8px;" />
          <view class="pcp-file-line" style="width: 48px; margin-top: 6px;" />
          <view class="pcp-file-line" style="width: 40px; margin-top: 6px;" />
        </view>

        <!-- 右侧铅笔 -->
        <view class="pcp-pencil">
          <!-- 笔尖 -->
          <view class="pcp-pencil-tip" />
          <!-- 笔杆 -->
          <view class="pcp-pencil-body" />
          <!-- 笔帽 -->
          <view class="pcp-pencil-cap" />
        </view>
      </view>

      <!-- 文字区 -->
      <view class="pcp-text-area">
        <text class="pcp-text-main">完善全部资料即可获得脱单机会</text>
        <text class="pcp-text-sub">几秒时间，缘分就会开启！</text>
      </view>

      <!-- 按钮区 -->
      <view class="pcp-btn-area">
        <view class="pcp-btn" @tap="handleGoProfile">
          <text>去完善资料</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const handleMaskClick = () => {
  emit('update:show', false)
}

const handleGoProfile = () => {
  emit('update:show', false)
  // 关闭登录页等所有非 tab 页面，直接打开编辑资料页
  uni.reLaunch({ url: '/pages/edit-profile/index' })
}
</script>

<style lang="scss" scoped>
// ===== 遮罩层 =====
.pcp-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

// ===== 弹窗卡片 =====
.pcp-card {
  width: 320px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

// ===== 插画区 =====
.pcp-illustration {
  position: relative;
  height: 180px;
  background: linear-gradient(to bottom, #fce7f3, #ffffff);
  border-radius: 24px 24px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

// ===== 装饰元素 =====
.pcp-deco {
  position: absolute;
}

// 左上 ×
.pcp-deco-x {
  top: 20%;
  left: 20%;
  font-size: 20px;
  color: #a78bfa;
  font-weight: bold;
  line-height: 1;
}

// 左下粉色菱形
.pcp-deco-diamond {
  bottom: 15%;
  left: 15%;
  width: 10px;
  height: 10px;
  background: #f9a8d4;
  transform: rotate(45deg);
}

// 右上四角星
.pcp-deco-star {
  top: 15%;
  right: 15%;
  font-size: 18px;
  color: #fbbf24;
  line-height: 1;
}

// 右下空心圆环
.pcp-deco-ring {
  bottom: 20%;
  right: 20%;
  width: 12px;
  height: 12px;
  border: 2px solid #fbbf24;
  border-radius: 50%;
  background: transparent;
}

// ===== 中央文件图标 =====
.pcp-file-icon {
  width: 80px;
  height: 100px;
  background: #fbcfe8;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 14px;
  position: relative;
  z-index: 2;
}

// 黄色圆形头像
.pcp-file-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fbbf24;
}

// 占位文字线
.pcp-file-line {
  height: 3px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 2px;
}

// ===== 右侧铅笔 =====
.pcp-pencil {
  position: absolute;
  right: 36%;
  top: 20%;
  z-index: 3;
  transform: rotate(-30deg);
  display: flex;
  flex-direction: column;
  align-items: center;
}

// 笔杆
.pcp-pencil-body {
  width: 10px;
  height: 60px;
  background: #34d399;
  border-radius: 2px 2px 0 0;
}

// 笔尖（三角形）
.pcp-pencil-tip {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 14px solid #4b3621;
}

// 笔帽
.pcp-pencil-cap {
  width: 12px;
  height: 6px;
  background: #fbbf24;
  border-radius: 2px 2px 0 0;
}

// ===== 文字区 =====
.pcp-text-area {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pcp-text-main {
  font-size: 16px;
  color: #374151;
  line-height: 1.5;
  text-align: center;
}

.pcp-text-sub {
  margin-top: 4px;
  font-size: 14px;
  color: #6b7280;
  text-align: center;
}

// ===== 按钮区 =====
.pcp-btn-area {
  padding: 8px 24px 24px;
}

.pcp-btn {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(to right, #fb7185, #f43f5e);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
  }
}
</style>
