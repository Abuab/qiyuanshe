<template>
  <!-- 遮罩层（无法通过点击关闭） -->
  <view v-if="show" class="pcp-overlay" @tap.stop>
    <!-- 弹窗卡片 -->
    <view class="pcp-card">
      <!-- 插画区 -->
      <view class="pcp-illustration">
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
