<template>
  <!-- 遮罩层（无法通过点击关闭） -->
  <view v-if="show" class="pcp-overlay" @tap.stop>
    <!-- 弹窗卡片 -->
    <view class="pcp-card">
      <!-- 插画区 -->
      <view class="pcp-illustration">
        <!-- 装饰元素 -->
        <text class="pcp-deco pcp-deco-x">×</text>
        <view class="pcp-deco pcp-deco-diamond" />
        <view class="pcp-deco pcp-deco-star ico ico-star ico-sm"></view>
        <view class="pcp-deco pcp-deco-ring" />

        <!-- 头像区（有真实头像时展示） -->
        <view v-if="avatarUrl" class="pcp-real-avatar-wrap">
          <image class="pcp-real-avatar" :src="avatarUrl" mode="aspectFill" />
          <view v-if="showReviewBadge" class="pcp-review-badge">待审核</view>
        </view>

        <!-- 默认文件图标（无真实头像时） -->
        <view v-else class="pcp-file-icon">
          <view class="pcp-file-avatar" />
          <view class="pcp-file-line" style="width: 32px; margin-top: 8px;" />
          <view class="pcp-file-line" style="width: 48px; margin-top: 6px;" />
          <view class="pcp-file-line" style="width: 40px; margin-top: 6px;" />
        </view>

        <!-- 右侧铅笔 -->
        <view class="pcp-pencil">
          <view class="pcp-pencil-tip" />
          <view class="pcp-pencil-body" />
          <view class="pcp-pencil-cap" />
        </view>
      </view>

      <!-- 昵称区 -->
      <view v-if="nickname" class="pcp-nickname">
        <text>{{ nickname }}</text>
      </view>

      <!-- 完成度百分比 -->
      <view v-if="percent !== undefined" class="pcp-percent-wrap">
        <view class="pcp-percent-bar-bg">
          <view class="pcp-percent-bar-fill" :style="{ width: percent + '%' }" />
        </view>
        <text class="pcp-percent-text">资料完善度: {{ percent }}%</text>
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
import { computed } from 'vue'

const props = defineProps<{
  show: boolean
  /** 资料完善度百分比 (0-100) */
  percent?: number
  /** 用户昵称 */
  nickname?: string
  /** 头像 URL */
  avatarUrl?: string
  /** 头像审核状态，0=审核中 */
  avatarReviewStatus?: number
  /** 下一步跳转路径（我的页面模式时传入，登录页模式不传） */
  nextStepUrl?: string
}>()

const showReviewBadge = computed(() => props.avatarReviewStatus === 0)

const handleGoProfile = () => {
  if (props.nextStepUrl) {
    // 我的页面模式：直接跳转到下一步
    uni.navigateTo({ url: props.nextStepUrl })
  } else {
    // 登录页模式：先回到首页（清除登录页栈），再跳转基本信息填写页
    uni.switchTab({
      url: '/pages/index/index',
      success() {
        uni.navigateTo({ url: '/subpkg-pages/basic-info/index' })
      },
    })
  }
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

.pcp-deco-x {
  top: 20%;
  left: 20%;
  font-size: 20px;
  color: #a78bfa;
  font-weight: bold;
  line-height: 1;
}

.pcp-deco-diamond {
  bottom: 15%;
  left: 15%;
  width: 10px;
  height: 10px;
  background: #f9a8d4;
  transform: rotate(45deg);
}

.pcp-deco-star {
  top: 15%;
  right: 15%;
}

.pcp-deco-ring {
  bottom: 20%;
  right: 20%;
  width: 12px;
  height: 12px;
  border: 2px solid #fbbf24;
  border-radius: 50%;
  background: transparent;
}

// ===== 真实头像区 =====
.pcp-real-avatar-wrap {
  position: relative;
  z-index: 2;
}

.pcp-real-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pcp-review-badge {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: #f59e0b;
  color: #ffffff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

// ===== 默认文件图标 =====
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

.pcp-file-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fbbf24;
}

.pcp-file-line {
  height: 3px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 2px;
}

// ===== 昵称 =====
.pcp-nickname {
  padding: 8px 24px 0;
  text-align: center;

  text {
    font-size: 16px;
    font-weight: bold;
    color: #333333;
  }
}

// ===== 完成度百分比 =====
.pcp-percent-wrap {
  padding: 12px 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pcp-percent-bar-bg {
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.pcp-percent-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #fb7185, #f43f5e);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.pcp-percent-text {
  margin-top: 8px;
  font-size: 14px;
  color: #999999;
}

// ===== 铅笔装饰 =====
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

.pcp-pencil-body {
  width: 10px;
  height: 60px;
  background: #34d399;
  border-radius: 2px 2px 0 0;
}

.pcp-pencil-tip {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 14px solid #4b3621;
}

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
