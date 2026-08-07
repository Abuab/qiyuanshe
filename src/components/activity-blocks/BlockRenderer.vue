<!-- 活动详情积木区块通用渲染器 -->
<script setup lang="ts">
import { getImageUrl } from '@/utils/common'

interface BlockBase {
  id: string
  type: string
}

interface DecorativeTitleBlock extends BlockBase {
  type: 'decorative_title'
  mainTitle: string
  subTitle: string
  subTitleColor: string
  footerText: string
  bgColor: string
}

interface ImageTextRowBlock extends BlockBase {
  type: 'image_text_row'
  imageUrl: string
  text: string
  alignment: 'left' | 'right' | 'center'
}

interface FullImageBlock extends BlockBase {
  type: 'full_image'
  imageUrl: string
  labelText: string
  labelPosition: 'top' | 'middle' | 'bottom'
}

interface TextBlock extends BlockBase {
  type: 'text'
  content: string
  alignment: 'left' | 'center' | 'right'
  fontSize: 'large' | 'medium' | 'small'
}

interface QuoteBlock extends BlockBase {
  type: 'quote'
  content: string
  alignment: 'left' | 'right'
}

interface HighlightTagBlock extends BlockBase {
  type: 'highlight_tag'
  text: string
  inline: boolean
}

interface NumberedTitleBlock extends BlockBase {
  type: 'numbered_title'
  number: string
  title: string
}

interface SceneCardBlock extends BlockBase {
  type: 'scene_card'
  bgImage: string
  innerText: string
  innerImages: string[]
}

interface FullBleedImageBlock extends BlockBase {
  type: 'full_bleed_image'
  imageUrl: string
}

interface ImageOverlayBlock extends BlockBase {
  type: 'image_overlay'
  imageUrl: string
  overlayText: string
  overlayPosition: 'top' | 'bottom'
  overlayBgColor: string
}

interface BubbleBlock extends BlockBase {
  type: 'bubble'
  text: string
  color: string
  arrow: 'down' | 'up' | 'left' | 'right'
  align: 'left' | 'center' | 'right'
}

interface GalleryBlock extends BlockBase {
  type: 'gallery'
  images: string[]
  columns: number
  textOverlay: string
  gap: number
}

interface ContactBlock extends BlockBase {
  type: 'contact'
  phone: string
  qrCode: string
  source: string
}

type Block =
  | DecorativeTitleBlock
  | ImageTextRowBlock
  | FullImageBlock
  | TextBlock
  | QuoteBlock
  | HighlightTagBlock
  | NumberedTitleBlock
  | SceneCardBlock
  | FullBleedImageBlock
  | ImageOverlayBlock
  | BubbleBlock
  | GalleryBlock
  | ContactBlock

const props = defineProps<{ block: Block }>()

function imgSrc(url: string) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/static/')) return url
  return getImageUrl(url)
}

function arrowStyle(color: string) {
  const dir = color.replace(';', '')
  return { borderTopColor: dir }
}

const FONT_SIZE_MAP: Record<string, string> = { large: '34rpx', medium: '28rpx', small: '24rpx' }
const BG_COLOR_MAP: Record<string, string> = {
  purple: 'linear-gradient(135deg, #B19CD9 0%, #9B7EC4 100%)',
  pink: 'linear-gradient(135deg, #FF6B9D 0%, #FF85A8 100%)',
  blue: 'linear-gradient(135deg, #6BB5FF 0%, #4DA0F0 100%)',
}
</script>

<template>
  <view v-if="block">

    <!-- 装饰标题卡片 -->
    <view v-if="block.type === 'decorative_title'" class="block-decorative-title" :style="{ background: BG_COLOR_MAP[block.bgColor] || block.bgColor || BG_COLOR_MAP.purple }">
      <text class="dt-main">{{ block.mainTitle }}</text>
      <text class="dt-sub" :style="{ color: block.subTitleColor || '#FFD700' }">{{ block.subTitle }}</text>
      <text class="dt-footer">{{ block.footerText }}</text>
    </view>

    <!-- 左图右文 -->
    <view v-else-if="block.type === 'image_text_row'" class="block-image-text-row">
      <image class="itr-image" :src="imgSrc(block.imageUrl)" mode="aspectFill" />
      <view class="itr-divider"></view>
      <view class="itr-text" :style="{ textAlign: block.alignment || 'right' }">
        <text>{{ block.text }}</text>
      </view>
    </view>

    <!-- 全宽图片 -->
    <view v-else-if="block.type === 'full_image'" class="block-full-image">
      <image class="fi-image" :src="imgSrc(block.imageUrl)" mode="widthFix" />
      <view v-if="block.labelText" class="fi-label" :class="'fi-label-' + (block.labelPosition || 'bottom')">
        <text>{{ block.labelText }}</text>
      </view>
    </view>

    <!-- 纯文本 -->
    <view v-else-if="block.type === 'text'" class="block-text" :style="{ textAlign: block.alignment || 'left' }">
      <text class="bt-content" :style="{ fontSize: FONT_SIZE_MAP[block.fontSize] || '28rpx' }">{{ block.content }}</text>
    </view>

    <!-- 引用文字 -->
    <view v-else-if="block.type === 'quote'" class="block-quote" :class="'quote-' + (block.alignment || 'left')">
      <text class="bq-icon">「</text>
      <text class="bq-text">{{ block.content }}</text>
      <text class="bq-icon">」</text>
    </view>

    <!-- 高亮标签 -->
    <view v-else-if="block.type === 'highlight_tag'" class="block-highlight-tag" :class="{ inline: block.inline }">
      <text class="ht-tag">{{ block.text }}</text>
    </view>

    <!-- 编号装饰标题 -->
    <view v-else-if="block.type === 'numbered_title'" class="block-numbered-title">
      <view class="nt-bg-blur"></view>
      <text class="nt-number">{{ block.number }}</text>
      <text class="nt-slash">/</text>
      <text class="nt-title">{{ block.title }}</text>
      <text class="nt-slash">/</text>
    </view>

    <!-- 场景氛围卡片 -->
    <view v-else-if="block.type === 'scene_card'" class="block-scene-card" :style="{ backgroundImage: 'url(' + imgSrc(block.bgImage) + ')' }">
      <view class="sc-overlay">
        <text class="sc-text">{{ block.innerText }}</text>
        <view v-if="block.innerImages && block.innerImages.length" class="sc-images">
          <image v-for="(img, i) in block.innerImages" :key="i" class="sc-img" :src="imgSrc(img)" mode="aspectFill" />
        </view>
      </view>
    </view>

    <!-- 全宽出血图 -->
    <view v-else-if="block.type === 'full_bleed_image'" class="block-full-bleed-image">
      <image class="fbi-image" :src="imgSrc(block.imageUrl)" mode="widthFix" />
    </view>

    <!-- 大图+文字叠加 -->
    <view v-else-if="block.type === 'image_overlay'" class="block-image-overlay">
      <image class="io-image" :src="imgSrc(block.imageUrl)" mode="widthFix" />
      <view v-if="block.overlayText" class="io-overlay" :class="'io-' + (block.overlayPosition || 'bottom')" :style="{ backgroundColor: block.overlayBgColor || 'rgba(255,107,157,0.85)' }">
        <text>{{ block.overlayText }}</text>
      </view>
    </view>

    <!-- 对话气泡 -->
    <view v-else-if="block.type === 'bubble'" class="block-bubble" :class="'bubble-align-' + (block.align || 'center')">
      <view class="bb-bubble" :style="{ backgroundColor: block.color || '#FFB74D' }">
        <text class="bb-text">{{ block.text }}</text>
      </view>
      <view class="bb-arrow" :class="'arrow-' + (block.arrow || 'down')" :style="arrowStyle(block.color || '#FFB74D')"></view>
    </view>

    <!-- 照片网格 -->
    <view v-else-if="block.type === 'gallery'" class="block-gallery">
      <view class="bg-grid" :style="{ gridTemplateColumns: `repeat(${block.columns || 2}, 1fr)`, gap: (block.gap || 16) + 'rpx' }">
        <image
          v-for="(img, i) in block.images"
          :key="i"
          class="bg-image"
          :src="imgSrc(img)"
          mode="aspectFill"
        />
      </view>
      <text v-if="block.textOverlay" class="bg-text">{{ block.textOverlay }}</text>
    </view>

    <!-- 联系信息 -->
    <view v-else-if="block.type === 'contact'" class="block-contact">
      <view class="bc-divider"></view>
      <view v-if="block.phone" class="bc-phone">
        <text class="bc-phone-label">预约电话：</text>
        <text class="bc-phone-number">{{ block.phone }}</text>
      </view>
      <image v-if="block.qrCode" class="bc-qrcode" :src="imgSrc(block.qrCode)" mode="aspectFit" />
      <text v-if="block.source" class="bc-source">{{ block.source }}</text>
    </view>

  </view>
</template>

<style lang="scss" scoped>
/* ===== 装饰标题卡片 ===== */
.block-decorative-title {
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  color: #fff;
  text-align: center;

  .dt-main {
    display: block;
    font-size: 40rpx;
    font-weight: bold;
    margin-bottom: 8rpx;
  }

  .dt-sub {
    display: block;
    font-size: 34rpx;
    font-weight: bold;
    margin-bottom: 16rpx;
  }

  .dt-footer {
    display: block;
    font-size: 24rpx;
    opacity: 0.9;
  }
}

/* ===== 左图右文 ===== */
.block-image-text-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  margin-bottom: 24rpx;

  .itr-image {
    width: 40%;
    height: 200rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
  }

  .itr-divider {
    width: 6rpx;
    height: 120rpx;
    background: linear-gradient(180deg, #FF6B9D 0%, rgba(255,107,157,0.2) 100%);
    border-radius: 3rpx;
    margin: 0 24rpx;
    flex-shrink: 0;
  }

  .itr-text {
    flex: 1;
    font-size: 28rpx;
    color: #333;
    line-height: 1.6;
  }
}

/* ===== 全宽图片 ===== */
.block-full-image {
  position: relative;
  margin-bottom: 24rpx;

  .fi-image {
    width: 100%;
    border-radius: 12rpx;
    display: block;
  }

  .fi-label {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    background: #FF6B9D;
    color: #fff;
    font-size: 24rpx;
    padding: 8rpx 24rpx;
    border-radius: 20rpx;

    &.fi-label-top { top: 16rpx; }
    &.fi-label-middle { top: 50%; transform: translate(-50%, -50%); }
    &.fi-label-bottom { bottom: 16rpx; }
  }
}

/* ===== 纯文本 ===== */
.block-text {
  padding: 8rpx 0;
  margin-bottom: 24rpx;

  .bt-content {
    color: #555;
    line-height: 1.8;
  }
}

/* ===== 引用文字 ===== */
.block-quote {
  padding: 16rpx 0;
  margin-bottom: 24rpx;

  .bq-icon {
    font-size: 24rpx;
    color: #ccc;
  }

  .bq-text {
    font-size: 26rpx;
    color: #999;
    margin: 0 4rpx;
  }

  &.quote-left { text-align: left; }
  &.quote-right { text-align: right; }
}

/* ===== 高亮标签 ===== */
.block-highlight-tag {
  margin-bottom: 24rpx;

  &.inline {
    display: inline-block;
    margin-bottom: 0;
  }

  .ht-tag {
    display: inline-block;
    background: #FF6B9D;
    color: #fff;
    font-size: 26rpx;
    padding: 6rpx 20rpx;
    border-radius: 8rpx;
  }
}

/* ===== 编号装饰标题 ===== */
.block-numbered-title {
  position: relative;
  text-align: center;
  padding: 48rpx 0 24rpx;
  margin-bottom: 24rpx;
  overflow: hidden;

  .nt-bg-blur {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320rpx;
    height: 160rpx;
    background: radial-gradient(ellipse, rgba(255,107,157,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }

  .nt-number {
    font-size: 72rpx;
    font-weight: bold;
    color: #333;
    position: relative;
    z-index: 1;
  }

  .nt-slash {
    font-size: 28rpx;
    color: #999;
    margin: 0 8rpx;
    position: relative;
    z-index: 1;
  }

  .nt-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    position: relative;
    z-index: 1;
  }
}

/* ===== 场景氛围卡片 ===== */
.block-scene-card {
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  background-size: cover;
  background-position: center;
  min-height: 400rpx;

  .sc-overlay {
    background: rgba(0, 0, 0, 0.3);
    min-height: 400rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32rpx;
  }

  .sc-text {
    color: #fff;
    font-size: 28rpx;
    line-height: 1.6;
    text-align: center;
  }

  .sc-images {
    display: flex;
    gap: 16rpx;
    margin-top: 24rpx;

    .sc-img {
      width: 120rpx;
      height: 120rpx;
      border-radius: 12rpx;
    }
  }
}

/* ===== 全宽出血图 ===== */
.block-full-bleed-image {
  margin: 0 -32rpx 24rpx -32rpx;

  .fbi-image {
    width: 100%;
    display: block;
  }
}

/* ===== 大图+文字叠加 ===== */
.block-image-overlay {
  position: relative;
  margin-bottom: 24rpx;

  .io-image {
    width: 100%;
    border-radius: 12rpx;
    display: block;
  }

  .io-overlay {
    padding: 16rpx 24rpx;
    color: #fff;
    font-size: 28rpx;

    &.io-top {
      border-radius: 12rpx 12rpx 0 0;
    }

    &.io-bottom {
      border-radius: 0 0 12rpx 12rpx;
    }
  }
}

/* ===== 对话气泡 ===== */
.block-bubble {
  margin-bottom: 24rpx;

  &.bubble-align-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  &.bubble-align-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &.bubble-align-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .bb-bubble {
    border-radius: 16rpx;
    padding: 24rpx 32rpx;
    max-width: 80%;

    .bb-text {
      color: #fff;
      font-size: 28rpx;
      line-height: 1.5;
      white-space: pre-wrap;
    }
  }

  .bb-arrow {
    width: 0;
    height: 0;
    border-left: 12rpx solid transparent;
    border-right: 12rpx solid transparent;

    &.arrow-down {
      border-top: 12rpx solid #FFB74D;
    }

    &.arrow-up {
      order: -1;
      border-bottom: 12rpx solid #FFB74D;
      margin-bottom: -1rpx;
      border-top: none;
    }

    &.arrow-left {
      display: none;
    }

    &.arrow-right {
      display: none;
    }
  }
}

/* ===== 照片网格 ===== */
.block-gallery {
  margin-bottom: 24rpx;

  .bg-grid {
    display: grid;
  }

  .bg-image {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12rpx;
  }

  .bg-text {
    display: block;
    text-align: center;
    font-size: 26rpx;
    color: #999;
    margin-top: 12rpx;
  }
}

/* ===== 联系信息 ===== */
.block-contact {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
  margin-bottom: 24rpx;

  .bc-divider {
    width: 120rpx;
    height: 4rpx;
    border-radius: 2rpx;
    background: linear-gradient(90deg, #81C784 0%, #FFD54F 100%);
    margin-bottom: 24rpx;
  }

  .bc-phone {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;

    .bc-phone-label {
      font-size: 28rpx;
      color: #999;
    }

    .bc-phone-number {
      font-size: 36rpx;
      font-weight: bold;
      color: #555;
    }
  }

  .bc-qrcode {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 16rpx;
  }

  .bc-source {
    font-size: 22rpx;
    color: #999;
  }
}
</style>
