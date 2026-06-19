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
          <view class="photo-row">
            <view class="example-card" v-for="(item, idx) in goodExamples" :key="'good-' + idx">
              <view class="example-img-wrap">
                <image :src="item.src" mode="aspectFill" class="example-img" />
                <view class="img-mark mark-good"></view>
              </view>
            </view>
          </view>
        </view>

        <!-- 不合格示例 -->
        <view class="guide-section">
          <view class="section-title-row">
            <view class="title-icon icon-cross"></view>
            <text class="section-title">以下照片不能通过审核</text>
          </view>
          <view class="photo-row">
            <view class="example-card" v-for="(item, idx) in badExamples" :key="'bad-' + idx">
              <view class="example-img-wrap">
                <image :src="item.src" mode="aspectFill" class="example-img" />
                <view class="img-mark mark-bad"></view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 底部按钮区 -->
      <view class="guide-actions">
        <view class="action-btn" @tap="handleCamera">
          <text class="action-text">相机</text>
        </view>
        <view class="action-sep"></view>
        <view class="action-btn" @tap="handleAlbum">
          <text class="action-text">从相册中选取</text>
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

// ===== Bottom Sheet（自适应高度，不设最大高度） =====
.photo-guide-sheet {
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
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
  padding: 20rpx 32rpx 12rpx;
  text-align: center;
}

.guide-tip {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.4;
}

// ===== 可滚动主体 =====
.guide-body {
  padding: 0 32rpx;
  max-height: 680rpx;
}

.guide-section {
  margin-bottom: 16rpx;
}

// ===== 段落标题 =====
.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.section-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #333333;
}

.title-icon {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  margin-right: 8rpx;
  flex-shrink: 0;
  position: relative;
}

.icon-check {
  background: #07C160;
  &::after {
    content: '';
    position: absolute;
    top: 6rpx;
    left: 10rpx;
    width: 6rpx;
    height: 10rpx;
    border: solid #fff;
    border-width: 0 2rpx 2rpx 0;
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
    width: 10rpx;
    height: 2rpx;
    background: #fff;
  }
  &::before { transform: translate(-50%, -50%) rotate(45deg); }
  &::after { transform: translate(-50%, -50%) rotate(-45deg); }
}

// ===== 图片行（flex 自动换行，不放横向滚动） =====
.photo-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 10rpx;
}

.example-card {
  flex-shrink: 0;
}

.example-img-wrap {
  width: 128rpx;
  height: 166rpx;
  border-radius: 16rpx;
  overflow: visible;
  position: relative;
  background: #f5f5f5;
}

.example-img {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}

// ===== 右下角标记 =====
.img-mark {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  z-index: 5;
}

.mark-good {
  background: #07C160;
  &::after {
    content: '';
    position: absolute;
    top: 7rpx;
    left: 11rpx;
    width: 6rpx;
    height: 10rpx;
    border: solid #fff;
    border-width: 0 2rpx 2rpx 0;
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
    width: 10rpx;
    height: 2rpx;
    background: #fff;
  }
  &::before { transform: translate(-50%, -50%) rotate(45deg); }
  &::after { transform: translate(-50%, -50%) rotate(-45deg); }
}

// ===== 底部按钮区 =====
.guide-actions {
  flex-shrink: 0;
  margin-top: 8rpx;
}

.action-btn {
  width: 100%;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-text {
  font-size: 30rpx;
  color: #333333;
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
  height: 16rpx;
  background: #F5F5F5;
  flex-shrink: 0;
}

// 取消按钮
.cancel-btn {
  .cancel-text {
    font-size: 30rpx;
    color: #666666;
  }
}
</style>
