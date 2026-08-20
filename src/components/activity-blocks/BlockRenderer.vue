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

interface TitleBlock extends BlockBase {
  type: 'title'
  mainTitle: string
  subTitle: string
  bgColor: string
  textColor: string
}

interface ImageTextRowBlock extends BlockBase {
  type: 'image_text_row'
  imageUrl: string
  text: string
  alignment: 'left' | 'right' | 'center'
}

interface FullImageBlock extends BlockBase {
  type: 'full_image'
  url: string
  caption: string
  labelPosition: 'top' | 'middle' | 'bottom'
}

interface ImageBlock extends BlockBase {
  type: 'image'
  url: string
  caption: string
  labelPosition?: 'top' | 'middle' | 'bottom'
}

interface TextBlock extends BlockBase {
  type: 'text'
  content: string
  align: 'left' | 'center' | 'right'
  color?: string
  fontSize?: 'large' | 'medium' | 'small'
  bold?: boolean
}

interface QuoteBlock extends BlockBase {
  type: 'quote'
  content: string
  alignment: 'left' | 'right'
  variant?: 'card'
}

interface HighlightTagBlock extends BlockBase {
  type: 'highlight_tag'
  text: string
  inline: boolean
  variant?: 'filled' | 'outline'
  color?: string
}

interface NumberedTitleBlock extends BlockBase {
  type: 'numbered_title'
  number: string
  title: string
  variant?: 'default' | 'hanging' | 'badge'
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
  url: string
  text: string
  position: 'top' | 'center' | 'bottom'
  textColor: string
  bgOverlay: string
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
  frame?: 'polaroid'
  captions?: string[]
}

interface ContactBlock extends BlockBase {
  type: 'contact'
  phone: string
  qrCode: string
  source: string
}

interface DividerBlock extends BlockBase {
  type: 'divider'
  style: 'default' | 'colorful' | 'dots' | 'end' | 'dashed'
}

interface TimelineBlock extends BlockBase {
  type: 'timeline'
  theme: 'dark' | 'light'
  items: { badge: string; time: string; text: string }[]
}

interface CircleTitleBlock extends BlockBase {
  type: 'circle_title'
  text: string
  palette: 'candy' | 'mint' | 'purple'
}

interface InfoCardBlock extends BlockBase {
  type: 'info_card'
  tabTitle: string
  mode: 'numbered' | 'label'
  theme: 'purple' | 'pink' | 'blue' | 'dark'
  items: { label: string; value: string }[]
}

interface QrGroupBlock extends BlockBase {
  type: 'qr_group'
  title: string
  items: { name: string; qrCode: string }[]
  note: string
}

type Block =
  | DecorativeTitleBlock
  | TitleBlock
  | ImageTextRowBlock
  | FullImageBlock
  | ImageBlock
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
  | DividerBlock
  | TimelineBlock
  | CircleTitleBlock
  | InfoCardBlock
  | QrGroupBlock

defineProps<{ block: Block }>()

function imgSrc(url: string) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/static/')) return url
  return getImageUrl(url)
}

function ctColor(palette: string, idx: number): string {
  if (palette === 'mint') return '#5FBF8F'
  const candy = ['#7ED6C0', '#FFB3C7']
  const purple = ['#B19CD9', '#FF85A8']
  const arr = palette === 'purple' ? purple : candy
  return arr[idx % 2]
}

function ctDecoColor(palette: string): string {
  if (palette === 'mint') return 'rgba(95,191,143,0.4)'
  if (palette === 'purple') return 'rgba(177,156,217,0.4)'
  return 'rgba(126,214,192,0.4)'
}

const FONT_SIZE_MAP: Record<string, string> = { large: '34rpx', medium: '28rpx', small: '24rpx' }
const BG_COLOR_MAP: Record<string, string> = {
  purple: 'linear-gradient(135deg, #B19CD9 0%, #9B7EC4 100%)',
  pink: 'linear-gradient(135deg, #FF6B9D 0%, #FF85A8 100%)',
  blue: 'linear-gradient(135deg, #6BB5FF 0%, #4DA0F0 100%)',
}
const TAG_COLORS: Record<string, string> = {
  pink: '#FF6B9D',
  blue: '#4DA0F0',
  yellow: '#F5A623',
  black: '#222222',
}

interface InfoCardTheme { bg: string; accent: string; text: string }
const INFO_CARD_THEMES: Record<string, InfoCardTheme> = {
  purple: { bg: '#F5F0FC', accent: '#9B7EC4', text: '#7A6A94' },
  pink: { bg: '#FFF2F6', accent: '#FF6B9D', text: '#8A5568' },
  blue: { bg: '#EFF6FF', accent: '#4DA0F0', text: '#4A6A8A' },
  dark: { bg: '#1A1A1A', accent: '#FF6B9D', text: '#FFFFFF' },
}

function hasInfoCardItems(items?: { label: string; value: string }[]): boolean {
  if (!items || items.length === 0) return false
  return items.some((it) => it.label || it.value)
}

function hasQrGroupItems(items?: { qrCode: string }[]): boolean {
  if (!items || items.length === 0) return false
  return items.some((it) => !!it.qrCode)
}
</script>

<template>
  <view v-if="block">

    <!-- 装饰标题卡片 (旧版 decorative_title) -->
    <view v-if="block.type === 'decorative_title'" class="block-decorative-title" :style="{ background: BG_COLOR_MAP[block.bgColor] || block.bgColor || BG_COLOR_MAP.purple }">
      <text class="dt-main">{{ block.mainTitle }}</text>
      <text class="dt-sub" :style="{ color: block.subTitleColor || '#FFD700' }">{{ block.subTitle }}</text>
      <text class="dt-footer">{{ block.footerText }}</text>
    </view>

    <!-- 装饰标题 (新版 title，复用同一套样式) -->
    <view v-else-if="block.type === 'title'" class="block-decorative-title" :style="{ background: BG_COLOR_MAP[block.bgColor] || block.bgColor || BG_COLOR_MAP.purple }">
      <text class="dt-main">{{ block.mainTitle }}</text>
      <text class="dt-sub" :style="{ color: block.textColor || '#FFD700' }">{{ block.subTitle }}</text>
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
    <view v-else-if="block.type === 'image' || block.type === 'full_image'" class="block-full-image">
      <image class="fi-image" :src="imgSrc(block.url)" mode="widthFix" />
      <view v-if="block.caption" class="fi-label" :class="'fi-label-' + (block.labelPosition || 'bottom')">
        <text>{{ block.caption }}</text>
      </view>
    </view>

    <!-- 纯文本 -->
    <view v-else-if="block.type === 'text'" class="block-text" :style="{ textAlign: block.align || 'left' }">
      <text class="bt-content" :style="{ fontSize: FONT_SIZE_MAP[block.fontSize || ''] || '28rpx', color: block.color || '#555', fontWeight: block.bold ? 'bold' : 'normal' }">{{ block.content }}</text>
    </view>

    <!-- 引用文字 -->
    <view v-else-if="block.type === 'quote'" class="block-quote" :class="'quote-' + (block.alignment || 'left') + (block.variant === 'card' ? ' qv-card' : '')">
      <template v-if="block.variant === 'card'">
        <view class="bq-card-bar"></view>
        <text class="bq-card-text">{{ block.content }}</text>
      </template>
      <template v-else>
        <text class="bq-icon">「</text>
        <text class="bq-text">{{ block.content }}</text>
        <text class="bq-icon">」</text>
      </template>
    </view>

    <!-- 高亮标签 -->
    <view v-else-if="block.type === 'highlight_tag'" class="block-highlight-tag" :class="{ inline: block.inline }">
      <text class="ht-tag" :class="'ht-' + (block.variant || 'filled')" :style="{
        backgroundColor: (block.variant !== 'outline') ? (TAG_COLORS[block.color!] || TAG_COLORS.pink) : 'transparent',
        borderColor: block.variant === 'outline' ? (TAG_COLORS[block.color!] || TAG_COLORS.pink) : 'transparent',
        color: block.variant === 'outline' ? (TAG_COLORS[block.color!] || TAG_COLORS.pink) : '#fff',
      }">{{ block.text }}</text>
    </view>

    <!-- 编号装饰标题 -->
    <view v-else-if="block.type === 'numbered_title'" class="block-numbered-title" :class="'nt-variant-' + (block.variant || 'default')">
      <!-- default 版式 -->
      <template v-if="!block.variant || block.variant === 'default'">
        <view class="nt-bg-blur"></view>
        <text class="nt-number">{{ block.number }}</text>
        <text class="nt-slash">/</text>
        <text class="nt-title">{{ block.title }}</text>
        <text class="nt-slash">/</text>
      </template>
      <!-- hanging 悬挂圆牌 -->
      <template v-else-if="block.variant === 'hanging'">
        <view class="nt-hanging-line"></view>
        <view class="nt-hanging-circle"><text>{{ block.number }}</text></view>
        <text class="nt-hanging-title">{{ block.title }}</text>
      </template>
      <!-- badge 黑牌白号 -->
      <template v-else-if="block.variant === 'badge'">
        <view class="nt-badge-block"><text>{{ block.number }}</text></view>
        <view class="nt-badge-title"><text>{{ block.title }}</text></view>
      </template>
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
      <image class="io-image" :src="imgSrc(block.url)" mode="widthFix" />
      <view v-if="block.text" class="io-overlay" :class="'io-' + (block.position || 'bottom')" :style="{ backgroundColor: block.bgOverlay || 'rgba(255,107,157,0.85)', color: block.textColor || '#fff' }">
        <text>{{ block.text }}</text>
      </view>
    </view>

    <!-- 对话气泡 -->
    <view v-else-if="block.type === 'bubble'" class="block-bubble" :class="'bubble-align-' + (block.align || 'center')">
      <view class="bb-bubble" :style="{ backgroundColor: block.color || '#FFB74D' }">
        <text class="bb-text">{{ block.text }}</text>
      </view>
      <view
        class="bb-arrow"
        :class="'arrow-' + (block.arrow || 'down')"
        :style="{ borderTopColor: block.color || '#FFB74D', borderBottomColor: block.color || '#FFB74D' }"
      ></view>
    </view>

    <!-- 照片网格 -->
    <view v-else-if="block.type === 'gallery' && block.images && block.images.length > 0" class="block-gallery" :class="{ 'gallery-polaroid': block.frame === 'polaroid' }">
      <view class="bg-grid" :style="{ gridTemplateColumns: `repeat(${block.columns || 2}, 1fr)`, gap: (block.gap || 16) + 'rpx' }">
        <view
          v-for="(img, i) in block.images"
          :key="i"
          class="bg-image-wrap"
          :class="{ 'bg-polaroid': block.frame === 'polaroid' }"
          :style="block.frame === 'polaroid' ? { transform: `rotate(${i % 2 === 0 ? '1.5' : '-1.5'}deg)` } : {}"
        >
          <template v-if="block.frame === 'polaroid'">
            <view class="bg-polaroid-inner">
              <image class="bg-image" :src="imgSrc(img)" mode="aspectFill" />
            </view>
            <text
              v-if="block.captions && block.captions[i]"
              class="bg-polaroid-caption"
            >{{ block.captions[i] }}</text>
          </template>
          <image v-else class="bg-image" :src="imgSrc(img)" mode="aspectFill" />
        </view>
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

    <!-- 分割线 -->
    <view v-else-if="block.type === 'divider'" class="block-divider">
      <view v-if="block.style === 'dots'" class="divider-dots">
        <view v-for="i in 5" :key="i" class="divider-dot" :class="'divider-dot-' + i"></view>
      </view>
      <text v-else-if="block.style === 'end'" class="divider-end">— END —</text>
      <view v-else class="divider-line" :class="'divider-' + (block.style || 'default')"></view>
    </view>

    <!-- 流程时间轴 -->
    <view v-else-if="block.type === 'timeline' && block.items && block.items.length > 0" class="block-timeline">
      <view v-for="(item, idx) in block.items" :key="idx" class="tl-item">
        <view class="tl-badge-wrapper">
          <view
            class="tl-badge"
            :style="{ fontSize: (item.badge || '').length > 4 ? '22rpx' : '26rpx' }"
          >
            <text>{{ item.badge }}</text>
          </view>
          <view v-if="idx < block.items.length - 1" class="tl-line" :class="'tl-line-' + (block.theme || 'dark')"></view>
        </view>
        <view class="tl-card" :class="'tl-card-' + (block.theme || 'dark')">
          <text class="tl-card-time" v-if="item.time">{{ item.time }}</text>
          <text class="tl-card-text">{{ item.text }}</text>
        </view>
      </view>
    </view>

    <!-- 圆字标题 -->
    <view v-else-if="block.type === 'circle_title' && block.text" class="block-circle-title">
      <view class="ct-chars">
        <view
          v-for="(ch, idx) in block.text.split('')"
          :key="idx"
          class="ct-char"
          :style="{ backgroundColor: ctColor(block.palette, idx) }"
        >
          <text>{{ ch }}</text>
        </view>
      </view>
      <view class="ct-deco" :style="{ backgroundColor: ctDecoColor(block.palette) }"></view>
    </view>

    <!-- 信息卡 -->
    <view
      v-else-if="block.type === 'info_card' && hasInfoCardItems(block.items)"
      class="block-info-card"
      :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).bg }"
    >
      <!-- tabTitle 圆字标题 -->
      <view v-if="block.tabTitle" class="ic-tab-row">
        <view
          v-for="(ch, idx) in (block.tabTitle.length > 8 ? block.tabTitle.slice(0, 8) : block.tabTitle).split('')"
          :key="idx"
          class="ic-tab-char"
          :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).accent }"
        >
          <text>{{ ch }}</text>
        </view>
      </view>
      <!-- mode=numbered 编号行 -->
      <view v-if="block.mode !== 'label'" v-for="(item, idx) in block.items" :key="'ic-n-' + idx" class="ic-item">
        <view class="ic-num" :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).accent }">
          <text>{{ idx + 1 }}</text>
        </view>
        <view class="ic-text" :style="{ color: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).text }">
          <text v-if="item.label" class="ic-label">{{ item.label }}</text>
          <text v-if="item.label && item.value">：</text>
          <text v-if="item.value">{{ item.value }}</text>
        </view>
      </view>
      <!-- mode=label 标签行 -->
      <view v-else v-for="(item, idx) in block.items" :key="'ic-t-' + idx" class="ic-item">
        <view class="ic-tag" :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).accent }">
          <text>{{ item.label }}</text>
        </view>
        <text class="ic-value" :style="{ color: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).text }">{{ item.value }}</text>
      </view>
    </view>

    <!-- 多码报名卡 -->
    <view
      v-else-if="block.type === 'qr_group' && hasQrGroupItems(block.items)"
      class="block-qr-group"
    >
      <text v-if="block.title" class="qg-title">{{ block.title }}</text>
      <view class="qg-items">
        <view
          v-for="(item, idx) in (block.items || []).slice(0, 4)"
          :key="idx"
          class="qg-item"
        >
          <image v-if="item.qrCode" class="qg-qrcode" :src="imgSrc(item.qrCode)" mode="aspectFit" />
          <view v-else class="qg-qrcode-empty"></view>
          <text v-if="item.name" class="qg-name">{{ item.name }}</text>
        </view>
      </view>
      <text v-if="block.note" class="qg-note">{{ block.note }}</text>
    </view>

  </view>
</template>

<style lang="scss" scoped>
/* ===== 装饰标题卡片 (decorative_title + title) ===== */
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

  &.qv-card {
    display: flex;
    align-items: flex-start;
    background: #FFF5F8;
    border-radius: 12rpx;
    padding: 28rpx 32rpx;
    text-align: left;
  }
  &.qv-card.quote-right { text-align: right; }

  .bq-card-bar {
    width: 6rpx;
    min-height: 48rpx;
    border-radius: 3rpx;
    background: #FF6B9D;
    margin-right: 20rpx;
    flex-shrink: 0;
    align-self: stretch;
  }

  .bq-card-text {
    font-size: 28rpx;
    color: #555;
    line-height: 1.8;
    flex: 1;
  }
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

    &.ht-outline {
      background: transparent;
      border: 2rpx solid;
    }
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

  /* hanging 悬挂圆牌 */
  &.nt-variant-hanging {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 0 24rpx;
    overflow: visible;
  }

  .nt-hanging-line {
    width: 2rpx;
    height: 40rpx;
    background: #D8A7B1;
  }

  .nt-hanging-circle {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: #B98A94;
    color: #fff;
    font-size: 40rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nt-hanging-title {
    margin-top: 20rpx;
    font-size: 34rpx;
    font-weight: bold;
    color: #8C6A72;
    border-bottom: 2rpx solid #B98A94;
    padding-bottom: 8rpx;
  }

  /* badge 黑牌白号 */
  &.nt-variant-badge {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32rpx 0 24rpx;
    overflow: visible;
  }

  .nt-badge-block {
    width: 88rpx;
    height: 88rpx;
    background: #1A1A1A;
    border-radius: 12rpx;
    color: #fff;
    font-size: 36rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nt-badge-title {
    margin-left: 20rpx;
    border: 2rpx solid #1A1A1A;
    border-radius: 8rpx;
    padding: 12rpx 28rpx;
    background: #fff;
    font-size: 32rpx;
    font-weight: bold;
    color: #1A1A1A;
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
    font-size: 28rpx;

    &.io-top {
      border-radius: 12rpx 12rpx 0 0;
    }

    &.io-bottom {
      border-radius: 0 0 12rpx 12rpx;
    }

    &.io-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 12rpx;
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
      border-top: 12rpx solid;
    }

    &.arrow-up {
      order: -1;
      border-bottom: 12rpx solid;
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

  .bg-image-wrap {
    width: 100%;
    height: 0;
    padding-bottom: 100%;
    position: relative;
    border-radius: 12rpx;
    overflow: hidden;

    &.bg-polaroid {
      background: #FFFFFF;
      padding: 16rpx 16rpx 0;
      border-radius: 8rpx;
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
      height: auto;
      overflow: visible;
    }
  }

  .bg-polaroid-inner {
    width: 100%;
    height: 0;
    padding-bottom: 100%;
    position: relative;
    border-radius: 4rpx;
    overflow: hidden;
  }

  .bg-polaroid-caption {
    display: block;
    text-align: center;
    font-size: 22rpx;
    color: #999;
    padding: 12rpx 0;
  }

  .bg-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
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

/* ===== 分割线 ===== */
.block-divider {
  margin-bottom: 24rpx;

  .divider-line {
    height: 2rpx;

    &.divider-default {
      background: #e0e0e0;
    }

    &.divider-colorful {
      height: 4rpx;
      background: linear-gradient(90deg, #81C784 0%, #FFD54F 100%);
      border-radius: 2rpx;
    }

    &.divider-dashed {
      height: 2rpx;
      background: repeating-linear-gradient(90deg, #DDDDDD 0, #DDDDDD 16rpx, transparent 16rpx, transparent 28rpx);
    }
  }

  .divider-dots {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20rpx;
    padding: 16rpx 0;
  }

  .divider-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;

    &.divider-dot-1 { background: #FFD6E4; }
    &.divider-dot-2 { background: #FFB3C7; }
    &.divider-dot-3 { background: #FF85A8; }
    &.divider-dot-4 { background: #FF6B9D; }
    &.divider-dot-5 { background: #F0447C; }
  }

  .divider-end {
    display: block;
    text-align: center;
    font-size: 24rpx;
    color: #BBBBBB;
    letter-spacing: 8rpx;
    padding: 16rpx 0;
  }
}

/* ===== 流程时间轴 ===== */
.block-timeline {
  margin-bottom: 24rpx;
  padding: 0 16rpx;

  .tl-item {
    display: flex;
    align-items: flex-start;
  }

  .tl-badge-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .tl-badge {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: #FF6B9D;
    color: #fff;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tl-line {
    width: 4rpx;
    flex: 1;
    min-height: 24rpx;

    &.tl-line-dark { background: #FFD6E4; }
    &.tl-line-light { background: #FFE4EC; }
  }

  .tl-card {
    flex: 1;
    margin-left: 24rpx;
    border-radius: 16rpx;
    padding: 28rpx 32rpx;
    margin-bottom: 8rpx;

    &.tl-card-dark {
      background: #1A1A1A;
      .tl-card-time, .tl-card-text { color: #FFFFFF; }
    }

    &.tl-card-light {
      background: #FFFFFF;
      border: 1rpx solid #EEEEEE;
      .tl-card-time { color: #333333; }
      .tl-card-text { color: #333333; }
    }

    .tl-card-time {
      display: block;
      font-size: 30rpx;
      font-weight: bold;
      margin-bottom: 8rpx;
    }

    .tl-card-text {
      display: block;
      font-size: 28rpx;
      line-height: 1.6;
    }
  }
}

/* ===== 圆字标题 ===== */
.block-circle-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0 24rpx;
  margin-bottom: 24rpx;

  .ct-chars {
    display: flex;
    gap: 16rpx;
  }

  .ct-char {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 30rpx;
    font-weight: bold;
  }

  .ct-deco {
    width: 120rpx;
    height: 4rpx;
    border-radius: 2rpx;
    margin-top: 20rpx;
  }
}

/* ===== 信息卡 ===== */
.block-info-card {
  border-radius: 16rpx;
  padding: 32rpx;
  position: relative;
  margin-bottom: 24rpx;

  .ic-tab-row {
    position: absolute;
    top: -24rpx;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12rpx;
  }

  .ic-tab-char {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    color: #fff;
    font-size: 24rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ic-item {
    display: flex;
    align-items: flex-start;
    margin-top: 24rpx;

    &:first-child { margin-top: 28rpx; }
  }

  .ic-num {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    color: #fff;
    font-size: 26rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 20rpx;
    margin-top: 2rpx;
  }

  .ic-text {
    font-size: 28rpx;
    line-height: 1.6;

    .ic-label {
      font-weight: bold;
    }
  }

  .ic-tag {
    min-width: 150rpx;
    text-align: center;
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    color: #fff;
    font-size: 26rpx;
    font-weight: bold;
    flex-shrink: 0;
    margin-right: 20rpx;
  }

  .ic-value {
    font-size: 28rpx;
    line-height: 1.6;
    flex: 1;
  }
}

/* ===== 多码报名卡 ===== */
.block-qr-group {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  border: 1rpx solid #F0F0F0;
  margin-bottom: 24rpx;

  .qg-title {
    display: block;
    text-align: center;
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 24rpx;
  }

  .qg-items {
    display: flex;
    justify-content: space-around;
  }

  .qg-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .qg-qrcode {
    width: 180rpx;
    height: 180rpx;
  }

  .qg-qrcode-empty {
    width: 180rpx;
    height: 180rpx;
    background: #F5F5F5;
    border-radius: 8rpx;
  }

  .qg-name {
    font-size: 24rpx;
    color: #555;
    margin-top: 12rpx;
    text-align: center;
  }

  .qg-note {
    display: block;
    text-align: center;
    font-size: 26rpx;
    color: #FF6B9D;
    margin-top: 24rpx;
  }
}
</style>
