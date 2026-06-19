<template>
  <view class="photo-guide-overlay" v-if="visible" @tap="handleCancel">
    <view class="photo-guide-sheet" @tap.stop :style="{ paddingBottom: 'calc(24rpx + ' + safeBottom + 'px)' }">
      <!-- 顶部提示 -->
      <view class="guide-header">
        <text class="guide-title">上传本人清晰正面照，会收获更多喜欢</text>
      </view>

      <scroll-view scroll-y class="guide-scroll" :show-scrollbar="false">
        <!-- 合格示例 -->
        <view class="guide-section">
          <view class="section-title-row">
            <view class="icon-check-green"></view>
            <text class="section-title green">以下照片可以通过审核</text>
          </view>
          <view class="photo-row">
            <view class="example-card" v-for="(item, idx) in goodExamples" :key="'good-' + idx">
              <view class="example-img-wrap good">
                <image
                  :src="item.src || defaultGoodPlaceholder"
                  mode="aspectFill"
                  class="example-img"
                />
                <view class="mark-mark mark-good"></view>
              </view>
              <text class="example-label green">{{ item.label }}</text>
            </view>
          </view>
        </view>

        <!-- 不合格示例 -->
        <view class="guide-section">
          <view class="section-title-row">
            <view class="icon-cross-red"></view>
            <text class="section-title red">以下照片不能通过审核</text>
          </view>
          <view class="photo-row multi-row">
            <view class="example-card" v-for="(item, idx) in badExamples" :key="'bad-' + idx">
              <view class="example-img-wrap bad">
                <image
                  :src="item.src || defaultBadPlaceholder"
                  mode="aspectFill"
                  class="example-img"
                />
                <view class="mark-mark mark-bad"></view>
              </view>
              <text class="example-label red">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 底部按钮 -->
      <view class="guide-actions">
        <view class="action-btn camera-btn" @tap="handleCamera">
          <text class="action-icon">📷</text>
          <text class="action-text">相机</text>
        </view>
        <view class="action-divider"></view>
        <view class="action-btn album-btn" @tap="handleAlbum">
          <text class="action-icon">🖼️</text>
          <text class="action-text">从相册中选取</text>
        </view>
        <view class="action-divider"></view>
        <view class="action-btn cancel-btn" @tap="handleCancel">
          <text class="action-text">取消</text>
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

// 默认占位图（用纯色块+文字代替，方便后续替换真实素材）
const defaultGoodPlaceholder = ref('')
const defaultBadPlaceholder = ref('')

// 默认示例数据（可替换为实际图片路径）
const defaultGoodExamples: ExampleItem[] = [
  { src: '', label: '光线充足' },
  { src: '', label: '五官清晰' },
  { src: '', label: '正面照' },
]

const defaultBadExamples: ExampleItem[] = [
  { src: '', label: '衣着不当' },
  { src: '', label: '模糊遮挡' },
  { src: '', label: '非人物照' },
  { src: '', label: '无正脸' },
  { src: '', label: '网络照片' },
]

const goodExamples = computed(() =>
  (props.goodExamples && props.goodExamples.length > 0) ? props.goodExamples : defaultGoodExamples
)

const badExamples = computed(() =>
  (props.badExamples && props.badExamples.length > 0) ? props.badExamples : defaultBadExamples
)

// 获取安全区
try {
  const sys = uni.getSystemInfoSync()
  safeBottom.value = sys.safeAreaInsets?.bottom || 0
} catch (_) {}

const handleCamera = () => {
  emit('camera')
  emit('update:visible', false)
}

const handleAlbum = () => {
  emit('album')
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
.photo-guide-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

.photo-guide-sheet {
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.guide-header {
  padding: 28rpx 32rpx 18rpx;
  text-align: center;
}

.guide-title {
  font-size: 28rpx;
  color: #999;
  font-weight: 400;
}

.guide-scroll {
  flex: 1;
  padding: 0 24rpx;
  max-height: 50vh;
}

.guide-section {
  margin-bottom: 28rpx;
}

.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;

  &.green { color: #07C160; }
  &.red { color: #FA5151; }
}

.icon-check-green {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #07C160;
  margin-right: 10rpx;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 6rpx;
    left: 11rpx;
    width: 8rpx;
    height: 14rpx;
    border: solid #fff;
    border-width: 0 3rpx 3rpx 0;
    transform: rotate(45deg);
  }
}

.icon-cross-red {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #FA5151;
  margin-right: 10rpx;
  position: relative;

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

.photo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  &.multi-row {
    .example-card {
      width: calc((100% - 32rpx) / 3);
    }
  }
}

.example-card {
  width: calc((100% - 32rpx) / 3);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.example-img-wrap {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;

  &.good {
    border: 3rpx solid #07C160;
  }
  &.bad {
    border: 3rpx solid #FA5151;
  }
}

.example-img {
  width: 100%;
  height: 100%;
}

// 占位图 pattern
.example-img-wrap .example-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .ph-icon {
    width: 60rpx;
    height: 60rpx;
    opacity: 0.2;
  }
}

.mark-mark {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;

  &.mark-good {
    background: #07C160;
    &::after {
      content: '';
      position: absolute;
      top: 7rpx;
      left: 13rpx;
      width: 8rpx;
      height: 14rpx;
      border: solid #fff;
      border-width: 0 3rpx 3rpx 0;
      transform: rotate(45deg);
    }
  }

  &.mark-bad {
    background: #FA5151;
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
}

.example-label {
  font-size: 20rpx;
  margin-top: 8rpx;
  text-align: center;

  &.green { color: #07C160; }
  &.red { color: #FA5151; }
}

// 底部按钮
.guide-actions {
  display: flex;
  align-items: center;
  border-top: 1rpx solid #eee;
  margin-top: 12rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
}

.action-icon {
  font-size: 40rpx;
  margin-bottom: 6rpx;
}

.action-text {
  font-size: 26rpx;
  color: #333;
}

.cancel-btn .action-text {
  color: #999;
}

.action-divider {
  width: 1rpx;
  height: 60rpx;
  background: #eee;
}
</style>
