<template>
  <view class="photo-guide-overlay" v-if="visible" @tap="handleCancel">
    <view class="photo-guide-sheet" @tap.stop :style="{ paddingBottom: safeBottom + 'px' }">
      <!-- 顶部提示 -->
      <view class="guide-header">
        <text class="guide-tip">上传本人清晰正面照，会收获更多喜欢</text>
      </view>

      <scroll-view scroll-y class="guide-body" :show-scrollbar="false">
        <!-- 正确示例 -->
        <view class="guide-section">
          <view class="section-title-row">
            <view class="title-icon icon-check"></view>
            <text class="section-title">以下照片可以通过审核</text>
          </view>
          <scroll-view scroll-x class="photo-scroll" :show-scrollbar="false">
            <view class="photo-scroll-inner">
              <view class="example-card" v-for="(item, idx) in goodExamples" :key="'good-' + idx">
                <view class="example-img-wrap">
                  <image
                    :src="item.src"
                    mode="aspectFill"
                    class="example-img"
                  />
                  <view class="img-mark mark-good"></view>
                </view>
                <text class="example-label good-label">{{ item.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 不合格示例 -->
        <view class="guide-section">
          <view class="section-title-row">
            <view class="title-icon icon-cross"></view>
            <text class="section-title">以下照片不能通过审核</text>
          </view>
          <scroll-view scroll-x class="photo-scroll" :show-scrollbar="false">
            <view class="photo-scroll-inner">
              <view class="example-card" v-for="(item, idx) in badExamples" :key="'bad-' + idx">
                <view class="example-img-wrap">
                  <image
                    :src="item.src"
                    mode="aspectFill"
                    class="example-img"
                  />
                  <view class="img-mark mark-bad"></view>
                </view>
                <text class="example-label bad-label">{{ item.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </scroll-view>

      <!-- 底部按钮区 -->
      <view class="guide-actions">
        <view class="action-btn" @tap="handleCamera">
          <view class="action-row">
            <text class="action-icon-camera"></text>
            <text class="action-text">相机</text>
          </view>
        </view>
        <view class="action-sep"></view>
        <view class="action-btn" @tap="handleAlbum">
          <view class="action-row">
            <text class="action-icon-album"></text>
            <text class="action-text">从相册中选取</text>
          </view>
        </view>
        <view class="action-gap"></view>
        <view class="action-btn cancel-btn" @tap="handleCancel">
          <text class="cancel-text">取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface ExampleItem {
  src: string
  label: string
}

const props = defineProps<{
  visible: boolean
  goodExamples?: ExampleItem[]
  badExamples?: ExampleItem[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'camera'): void
  (e: 'album'): void
  (e: 'cancel'): void
}>()

const safeBottom = ref(0)

// 占位图 URL（开发期使用 picsum 占位，上线前替换为真实素材）
const GOOD_PLACEHOLDERS = [
  'https://picsum.photos/seed/good1/200/260',
  'https://picsum.photos/seed/good2/200/260',
  'https://picsum.photos/seed/good3/200/260',
]
const BAD_PLACEHOLDERS = [
  'https://picsum.photos/seed/bad1/200/260',
  'https://picsum.photos/seed/bad2/200/260',
  'https://picsum.photos/seed/bad3/200/260',
  'https://picsum.photos/seed/bad4/200/260',
  'https://picsum.photos/seed/bad5/200/260',
]

const defaultGoodExamples: ExampleItem[] = [
  { src: GOOD_PLACEHOLDERS[0], label: '光线充足' },
  { src: GOOD_PLACEHOLDERS[1], label: '五官清晰' },
  { src: GOOD_PLACEHOLDERS[2], label: '正面照' },
]

const defaultBadExamples: ExampleItem[] = [
  { src: BAD_PLACEHOLDERS[0], label: '衣着不当' },
  { src: BAD_PLACEHOLDERS[1], label: '模糊遮挡' },
  { src: BAD_PLACEHOLDERS[2], label: '非人物照' },
  { src: BAD_PLACEHOLDERS[3], label: '无正脸' },
  { src: BAD_PLACEHOLDERS[4], label: '网络照片' },
]

const goodExamples = computed(() =>
  (props.goodExamples && props.goodExamples.length > 0) ? props.goodExamples : defaultGoodExamples
)

const badExamples = computed(() =>
  (props.badExamples && props.badExamples.length > 0) ? props.badExamples : defaultBadExamples
)

try {
  const sys = uni.getSystemInfoSync()
  safeBottom.value = sys.safeAreaInsets?.bottom || 0
} catch (_) {}

const handleCamera = () => { emit('camera'); emit('update:visible', false) }
const handleAlbum = () => { emit('album'); emit('update:visible', false) }
const handleCancel = () => { emit('cancel'); emit('update:visible', false) }
</script>

<style lang="scss" scoped>
// ===== 遮罩 =====
.photo-guide-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

// ===== Bottom Sheet =====
.photo-guide-sheet {
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;  // ~20px
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

// ===== 顶部提示 =====
.guide-header {
  padding: 32rpx 32rpx 20rpx;
  text-align: center;
}

.guide-tip {
  font-size: 28rpx;   // 14px
  color: #999999;
  line-height: 1.5;
}

// ===== 可滚动主体 =====
.guide-body {
  flex: 1;
  padding: 0 32rpx;
  max-height: 55vh;
}

.guide-section {
  margin-bottom: 28rpx;
}

// ===== 段落标题 =====
.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 18rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
}

.title-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  flex-shrink: 0;
  position: relative;
}

.icon-check {
  background: #07C160;
  &::after {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 14rpx;
    width: 8rpx;
    height: 14rpx;
    border: solid #fff;
    border-width: 0 3rpx 3rpx 0;
    transform: rotate(45deg);
  }
}

.icon-cross {
  background: #FF4D4F;
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 14rpx;
    height: 3rpx;
    background: #fff;
  }
  &::before { transform: translate(-50%, -50%) rotate(45deg); }
  &::after { transform: translate(-50%, -50%) rotate(-45deg); }
}

// ===== 横向滚动图片区 =====
.photo-scroll {
  width: 100%;
  white-space: nowrap;
}

.photo-scroll-inner {
  display: inline-flex;
  gap: 20rpx;  // 10px
  padding: 0 4rpx;  // 整体 padding 已在 guide-body 32rpx 基础上
}

.example-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.example-img-wrap {
  width: 200rpx;   // ~100px
  height: 260rpx;  // ~130px
  border-radius: 24rpx;  // ~12px
  overflow: hidden;
  position: relative;
  background: #f5f5f5;
}

.example-img {
  width: 100%;
  height: 100%;
}

// ===== 右下角标记（约 1/3 在图片外） =====
.img-mark {
  position: absolute;
  bottom: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  z-index: 2;
}

.mark-good {
  background: #07C160;
  &::after {
    content: '';
    position: absolute;
    top: 9rpx;
    left: 15rpx;
    width: 8rpx;
    height: 14rpx;
    border: solid #fff;
    border-width: 0 3rpx 3rpx 0;
    transform: rotate(45deg);
  }
}

.mark-bad {
  background: #FF4D4F;
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 14rpx;
    height: 3rpx;
    background: #fff;
  }
  &::before { transform: translate(-50%, -50%) rotate(45deg); }
  &::after { transform: translate(-50%, -50%) rotate(-45deg); }
}

// ===== 标签文字 =====
.example-label {
  font-size: 24rpx;  // 12px
  margin-top: 10rpx;
  text-align: center;
  white-space: normal;
}

.good-label {
  color: #07C160;
}

.bad-label {
  color: #999999;
}

// ===== 底部按钮区 =====
.guide-actions {
  flex-shrink: 0;
  margin-top: 16rpx;
}

.action-btn {
  width: 100%;
  height: 112rpx;  // 56px
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-text {
  font-size: 32rpx;
  color: #333333;
}

// 相机图标（CSS 绘制简化相机形状）
.action-icon-camera {
  display: inline-block;
  width: 36rpx;
  height: 30rpx;
  margin-right: 12rpx;
  border: 3rpx solid #333;
  border-radius: 6rpx;
  position: relative;
  background: #fff;
  &::after {
    content: '';
    position: absolute;
    top: -8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 16rpx;
    height: 8rpx;
    background: #333;
    border-radius: 4rpx 4rpx 0 0;
  }
}

// 相册图标（CSS 绘制简化图片/相册形状）
.action-icon-album {
  display: inline-block;
  width: 34rpx;
  height: 30rpx;
  margin-right: 12rpx;
  border: 3rpx solid #333;
  border-radius: 6rpx;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    bottom: -4rpx;
    right: -4rpx;
    width: 14rpx;
    height: 12rpx;
    border: 3rpx solid #333;
    border-radius: 3rpx;
    background: #333;
    z-index: 1;
  }
}

// 按钮间 1px 分隔线
.action-sep {
  width: 100%;
  height: 1px;
  background: #E5E5E5;
  flex-shrink: 0;
}

// 8px 灰色间隔条
.action-gap {
  width: 100%;
  height: 16rpx;  // ~8px
  background: #F5F5F5;
  flex-shrink: 0;
}

// 取消按钮
.cancel-btn {
  .cancel-text {
    font-size: 32rpx;
    color: #666666;
  }
}
</style>
