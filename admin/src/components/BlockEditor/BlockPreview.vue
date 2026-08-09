<!-- 手机预览框：复刻 C 端 BlockRenderer.vue 视觉效果（375px ≈ 750rpx） -->
<template>
  <div class="block-preview">
    <div class="preview-phone">
      <!-- 模拟顶部状态栏 -->
      <div class="phone-top-bar">{{ previewTitle }}</div>
      <div class="phone-screen">
        <!-- 积木列表 -->
        <template v-if="blocks.length > 0">
          <div
            v-for="block in blocks"
            :key="block.id"
            class="preview-block"
            :class="{ 'preview-block-active': activeBlockId === block.id }"
            @click="$emit('selectBlock', block.id)"
          >

            <!-- 装饰标题 (title + decorative_title) -->
            <div v-if="block.type === 'title' || block.type === 'decorative_title'" class="pb-decorative-title" :style="titleBgStyle(block)">
              <div class="pb-dt-main">{{ block.mainTitle || '(主标题)' }}</div>
              <div class="pb-dt-sub" :style="{ color: block.type === 'title' ? (block.textColor || '#FFD700') : (block.subTitleColor || '#FFD700') }">
                {{ block.type === 'title' ? (block.subTitle || '(副标题)') : (block.subTitle || '') }}
              </div>
              <div v-if="block.type === 'decorative_title' && block.footerText" class="pb-dt-footer">{{ block.footerText }}</div>
            </div>

            <!-- 编号装饰标题 -->
            <div v-else-if="block.type === 'numbered_title'" class="pb-numbered-title" :class="'pb-nt-variant-' + (block.variant || 'default')">
              <template v-if="!block.variant || block.variant === 'default'">
                <div class="pb-nt-bg"></div>
                <span class="pb-nt-number">{{ block.number || '01' }}</span>
                <span class="pb-nt-slash">/</span>
                <span class="pb-nt-title">{{ block.title || '(标题)' }}</span>
                <span class="pb-nt-slash">/</span>
              </template>
              <template v-else-if="block.variant === 'hanging'">
                <div class="pb-nt-hanging-line"></div>
                <div class="pb-nt-hanging-circle">{{ block.number || '01' }}</div>
                <span class="pb-nt-hanging-title">{{ block.title || '(标题)' }}</span>
              </template>
              <template v-else-if="block.variant === 'badge'">
                <div class="pb-nt-badge-block">{{ block.number || '01' }}</div>
                <div class="pb-nt-badge-title">{{ block.title || '(标题)' }}</div>
              </template>
            </div>

            <!-- 左图右文 -->
            <div v-else-if="block.type === 'image_text_row'" class="pb-image-text-row">
              <div class="pb-itr-img">
                <div v-if="!block.imageUrl" class="pb-img-placeholder">图</div>
                <img v-else :src="block.imageUrl" />
              </div>
              <div class="pb-itr-divider"></div>
              <div class="pb-itr-text" :style="{ textAlign: block.alignment || 'right' }">
                {{ block.text || '(文字内容)' }}
              </div>
            </div>

            <!-- 全宽图片 (image + full_image) -->
            <div v-else-if="block.type === 'image' || block.type === 'full_image'" class="pb-full-image">
              <div v-if="!block.url" class="pb-img-placeholder pb-img-large">点击上传图片</div>
              <img v-else :src="block.url" />
              <div v-if="block.caption" class="pb-fi-label" :class="'pb-fi-' + (block.labelPosition || 'bottom')">
                {{ block.caption }}
              </div>
            </div>

            <!-- 全宽出血图 -->
            <div v-else-if="block.type === 'full_bleed_image'" class="pb-full-bleed">
              <div v-if="!block.imageUrl" class="pb-img-placeholder pb-img-full">全宽图片</div>
              <img v-else :src="block.imageUrl" />
            </div>

            <!-- 图文叠加 -->
            <div v-else-if="block.type === 'image_overlay'" class="pb-image-overlay">
              <div v-if="!block.url" class="pb-img-placeholder pb-img-large">点击上传图片</div>
              <img v-else :src="block.url" />
              <div v-if="block.text" class="pb-io-overlay" :class="'pb-io-' + (block.position || 'bottom')" :style="{ backgroundColor: block.bgOverlay || 'rgba(255,107,157,0.85)', color: block.textColor || '#fff' }">
                {{ block.text }}
              </div>
            </div>

            <!-- 场景氛围卡片 -->
            <div v-else-if="block.type === 'scene_card'" class="pb-scene-card" :style="block.bgImage ? { backgroundImage: 'url(' + block.bgImage + ')' } : {}">
              <div class="pb-sc-overlay">
                <div class="pb-sc-text">{{ block.innerText || '(场景描述文字)' }}</div>
                <div v-if="block.innerImages && block.innerImages.length" class="pb-sc-images">
                  <img v-for="(img, i) in block.innerImages" :key="i" :src="img" class="pb-sc-img" />
                </div>
              </div>
            </div>

            <!-- 纯文本 -->
            <div v-else-if="block.type === 'text'" class="pb-text" :style="{ textAlign: block.align || 'left' }">
              <span :style="{ fontSize: pbFontSize(block.fontSize), color: block.color || '#555', fontWeight: block.bold ? 'bold' : 'normal' }">{{ block.content || '(文本内容)' }}</span>
            </div>

            <!-- 引用文字 -->
            <div v-else-if="block.type === 'quote'" class="pb-quote" :class="'pb-quote-' + (block.alignment || 'left') + (block.variant === 'card' ? ' pb-qv-card' : '')">
              <template v-if="block.variant === 'card'">
                <div class="pb-bq-card-bar"></div>
                <span class="pb-bq-card-text">{{ block.content || '(引用内容)' }}</span>
              </template>
              <template v-else>
                <span class="pb-bq-icon">「</span>
                <span class="pb-bq-text">{{ block.content || '(引用内容)' }}</span>
                <span class="pb-bq-icon">」</span>
              </template>
            </div>

            <!-- 高亮标签 -->
            <div v-else-if="block.type === 'highlight_tag'" class="pb-highlight-tag" :class="{ 'pb-inline': block.inline }">
              <span class="pb-ht-tag" :class="{ 'pb-ht-outline': block.variant === 'outline' }" :style="{
                backgroundColor: block.variant !== 'outline' ? (previewTagColor(block.color)) : 'transparent',
                borderColor: block.variant === 'outline' ? previewTagColor(block.color) : 'transparent',
                color: block.variant === 'outline' ? previewTagColor(block.color) : '#fff',
              }">{{ block.text || '(标签)' }}</span>
            </div>

            <!-- 对话气泡 -->
            <div v-else-if="block.type === 'bubble'" class="pb-bubble" :class="'pb-bubble-' + (block.align || 'center')">
              <div class="pb-bb-bubble" :style="{ backgroundColor: block.color || '#FFB74D' }">
                <span class="pb-bb-text">{{ block.text || '(气泡文字)' }}</span>
              </div>
              <div class="pb-bb-arrow" :class="'pb-arrow-' + (block.arrow || 'down')" :style="arrowBorderColor(block)"></div>
            </div>

            <!-- 照片网格 -->
            <div v-else-if="block.type === 'gallery'" class="pb-gallery" :class="{ 'pb-gallery-polaroid': block.frame === 'polaroid' }">
              <div class="pb-bg-grid" :style="{ gridTemplateColumns: `repeat(${block.columns || 2}, 1fr)`, gap: ((block.gap || 16) / 2) + 'px' }">
                <div
                  v-for="(img, i) in (block.images && block.images.length ? block.images : ['', ''])"
                  :key="i"
                  class="pb-bg-img-wrap"
                  :class="{ 'pb-bg-polaroid': block.frame === 'polaroid' }"
                  :style="block.frame === 'polaroid' ? { transform: `rotate(${i % 2 === 0 ? '1.5' : '-1.5'}deg)` } : {}"
                >
                  <img v-if="img" :src="img" class="pb-bg-img" :style="block.frame === 'polaroid' ? { borderRadius: '2px' } : {}" />
                  <div v-else class="pb-img-placeholder" :class="block.frame === 'polaroid' ? 'pb-img-square-polaroid' : 'pb-img-square'">图</div>
                  <div
                    v-if="block.frame === 'polaroid' && block.captions && block.captions[i]"
                    class="pb-bg-polaroid-caption"
                  >{{ block.captions[i] }}</div>
                </div>
              </div>
              <div v-if="block.textOverlay" class="pb-bg-text">{{ block.textOverlay }}</div>
            </div>

            <!-- 联系信息 -->
            <div v-else-if="block.type === 'contact'" class="pb-contact">
              <div class="pb-bc-divider"></div>
              <div v-if="block.phone" class="pb-bc-phone">
                <span class="pb-bc-label">预约电话：</span>
                <span class="pb-bc-number">{{ block.phone }}</span>
              </div>
              <img v-if="block.qrCode" :src="block.qrCode" class="pb-bc-qrcode" />
              <div v-if="block.source" class="pb-bc-source">{{ block.source }}</div>
            </div>

            <!-- 分割线 -->
            <div v-else-if="block.type === 'divider'" class="pb-divider">
              <div v-if="block.style === 'dots'" class="pb-divider-dots">
                <div v-for="i in 5" :key="i" class="pb-divider-dot" :class="'pb-divider-dot-' + i"></div>
              </div>
              <span v-else-if="block.style === 'end'" class="pb-divider-end">— END —</span>
              <div v-else class="pb-divider-line" :class="'pb-divider-' + (block.style || 'default')"></div>
            </div>

            <!-- 流程时间轴 -->
            <div v-else-if="block.type === 'timeline' && block.items && block.items.length > 0" class="pb-timeline">
              <div v-for="(item, idx) in block.items" :key="idx" class="pb-tl-item">
                <div class="pb-tl-badge-wrap">
                  <div
                    class="pb-tl-badge"
                    :style="{ fontSize: (item.badge || '').length > 4 ? '11px' : '13px' }"
                  >{{ item.badge }}</div>
                  <div v-if="idx < block.items.length - 1" class="pb-tl-line" :class="'pb-tl-line-' + (block.theme || 'dark')"></div>
                </div>
                <div class="pb-tl-card" :class="'pb-tl-card-' + (block.theme || 'dark')">
                  <span v-if="item.time" class="pb-tl-time">{{ item.time }}</span>
                  <span class="pb-tl-text">{{ item.text }}</span>
                </div>
              </div>
            </div>

            <!-- 圆字标题 -->
            <div v-else-if="block.type === 'circle_title' && block.text" class="pb-circle-title">
              <div class="pb-ct-chars">
                <span
                  v-for="(ch, idx) in block.text.split('')"
                  :key="idx"
                  class="pb-ct-char"
                  :style="{ backgroundColor: previewCtColor(block.palette, idx) }"
                >{{ ch }}</span>
              </div>
              <div class="pb-ct-deco" :style="{ backgroundColor: previewCtDecoColor(block.palette) }"></div>
            </div>

            <!-- 信息卡 -->
            <div
              v-else-if="block.type === 'info_card' && hasPreviewInfoCardItems(block.items)"
              class="pb-info-card"
              :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).bg }"
            >
              <div v-if="block.tabTitle" class="pb-ic-tab-row">
                <div
                  v-for="(ch, idx) in (block.tabTitle.length > 8 ? block.tabTitle.slice(0, 8) : block.tabTitle).split('')"
                  :key="idx"
                  class="pb-ic-tab-char"
                  :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).accent }"
                >{{ ch }}</div>
              </div>
              <!-- mode=numbered -->
              <template v-if="block.mode !== 'label'">
                <div v-for="(item, idx) in (block.items || [])" :key="'num-' + idx" class="pb-ic-item">
                  <div class="pb-ic-num" :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).accent }">{{ idx + 1 }}</div>
                  <div class="pb-ic-text" :style="{ color: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).text }">
                    <span v-if="item.label" class="pb-ic-label">{{ item.label }}</span>
                    <span v-if="item.label && item.value">：</span>
                    <span v-if="item.value">{{ item.value }}</span>
                  </div>
                </div>
              </template>
              <!-- mode=label -->
              <template v-else>
                <div v-for="(item, idx) in (block.items || [])" :key="'lbl-' + idx" class="pb-ic-item">
                  <div class="pb-ic-tag" :style="{ backgroundColor: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).accent }">{{ item.label }}</div>
                  <span class="pb-ic-value" :style="{ color: (INFO_CARD_THEMES[block.theme] || INFO_CARD_THEMES.purple).text }">{{ item.value }}</span>
                </div>
              </template>
            </div>

            <!-- 多码报名卡 -->
            <div
              v-else-if="block.type === 'qr_group' && hasPreviewQrGroupItems(block.items)"
              class="pb-qr-group"
            >
              <div v-if="block.title" class="pb-qg-title">{{ block.title }}</div>
              <div class="pb-qg-items">
                <div v-for="(item, idx) in (block.items || []).slice(0, 4)" :key="idx" class="pb-qg-item">
                  <img v-if="item.qrCode" :src="item.qrCode" class="pb-qg-qrcode" />
                  <div v-else class="pb-qg-qrcode-empty"></div>
                  <span v-if="item.name" class="pb-qg-name">{{ item.name }}</span>
                </div>
              </div>
              <div v-if="block.note" class="pb-qg-note">{{ block.note }}</div>
            </div>

            <!-- 未知类型 -->
            <div v-else class="pb-unknown">[{{ block.type }}]</div>

          </div>
        </template>
        <div v-else class="pb-empty">暂无内容</div>
        <div class="pb-bottom-safe"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Block {
  id: string
  type: string
  [key: string]: any
}

const props = defineProps<{
  blocks: Block[]
  activeBlockId?: string
  previewTitle?: string
}>()

defineEmits<{
  selectBlock: [id: string]
}>()

const BG_COLOR_MAP: Record<string, string> = {
  purple: 'linear-gradient(135deg, #B19CD9 0%, #9B7EC4 100%)',
  pink: 'linear-gradient(135deg, #FF6B9D 0%, #FF85A8 100%)',
  blue: 'linear-gradient(135deg, #6BB5FF 0%, #4DA0F0 100%)',
}

function titleBgStyle(block: Block) {
  const c = block.bgColor || 'pink'
  const bg = BG_COLOR_MAP[c] || c
  return { background: bg }
}

function pbFontSize(fs?: string) {
  const map: Record<string, string> = { large: '17px', medium: '14px', small: '12px' }
  return map[fs || ''] || '14px'
}

function arrowBorderColor(block: Block) {
  const c = block.color || '#FFB74D'
  return { borderTopColor: c, borderBottomColor: c }
}

function previewCtColor(palette: string, idx: number): string {
  if (palette === 'mint') return '#5FBF8F'
  const candy = ['#7ED6C0', '#FFB3C7']
  const purple = ['#B19CD9', '#FF85A8']
  const arr = palette === 'purple' ? purple : candy
  return arr[idx % 2]
}

function previewCtDecoColor(palette: string): string {
  if (palette === 'mint') return 'rgba(95,191,143,0.4)'
  if (palette === 'purple') return 'rgba(177,156,217,0.4)'
  return 'rgba(126,214,192,0.4)'
}

const TAG_COLORS: Record<string, string> = {
  pink: '#FF6B9D',
  blue: '#4DA0F0',
  yellow: '#F5A623',
  black: '#222222',
}

function previewTagColor(color?: string): string {
  return TAG_COLORS[color || ''] || TAG_COLORS.pink
}

const INFO_CARD_THEMES: Record<string, { bg: string; accent: string; text: string }> = {
  purple: { bg: '#F5F0FC', accent: '#9B7EC4', text: '#7A6A94' },
  pink: { bg: '#FFF2F6', accent: '#FF6B9D', text: '#8A5568' },
  blue: { bg: '#EFF6FF', accent: '#4DA0F0', text: '#4A6A8A' },
  dark: { bg: '#1A1A1A', accent: '#FF6B9D', text: '#FFFFFF' },
}

function hasPreviewInfoCardItems(items?: any[]): boolean {
  if (!items || items.length === 0) return false
  return items.some((it: any) => it.label || it.value)
}

function hasPreviewQrGroupItems(items?: any[]): boolean {
  if (!items || items.length === 0) return false
  return items.some((it: any) => !!it.qrCode)
}
</script>

<style lang="scss" scoped>
.block-preview {
  .preview-phone {
    width: 375px;
    border-radius: 30px;
    border: 2px solid #e0e0e0;
    overflow: hidden;
    background: #f5f5f5;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    position: sticky;
    top: 20px;

    .phone-top-bar {
      background: #fff;
      text-align: center;
      padding: 10px 0 8px;
      font-size: 13px;
      font-weight: 600;
      color: #333;
      border-bottom: 1px solid #eee;
    }

    .phone-screen {
      padding: 0 16px;
      background: #fff;
      min-height: 500px;
    }
  }

  .preview-block {
    cursor: pointer;
    transition: outline 0.15s;

    &:hover { outline: 1px dashed #409EFF; }
    &.preview-block-active { outline: 2px solid #409EFF; }
  }

  .pb-empty { padding: 32px; text-align: center; color: #c0c4cc; font-size: 14px; }
  .pb-bottom-safe { height: 24px; }
  .pb-unknown { padding: 8px; font-size: 12px; color: #c0c4cc; }

  /* placeholder */
  .pb-img-placeholder {
    background: #f0f0f0; border: 1px dashed #d0d0d0; display: flex;
    align-items: center; justify-content: center;
    color: #bbb; font-size: 13px; border-radius: 6px;
    &.pb-img-large { height: 150px; }
    &.pb-img-full { height: 140px; border-radius: 0; }
    &.pb-img-square { width: 100%; aspect-ratio: 1; }
  }

  /* ========== 装饰标题 ========== */
  .pb-decorative-title {
    border-radius: 10px; padding: 18px 16px; margin-bottom: 12px;
    color: #fff; text-align: center;
    .pb-dt-main { display: block; font-size: 20px; font-weight: bold; margin-bottom: 4px; }
    .pb-dt-sub { display: block; font-size: 17px; font-weight: bold; margin-bottom: 8px; }
    .pb-dt-footer { display: block; font-size: 12px; opacity: 0.9; }
  }

  /* ========== 编号装饰标题 ========== */
  .pb-numbered-title {
    position: relative; text-align: center;
    padding: 24px 0 12px; margin-bottom: 12px; overflow: hidden;
    .pb-nt-bg {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 160px; height: 80px;
      background: radial-gradient(ellipse, rgba(255,107,157,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    .pb-nt-number { font-size: 36px; font-weight: bold; color: #333; position: relative; z-index: 1; }
    .pb-nt-slash { font-size: 14px; color: #999; margin: 0 4px; position: relative; z-index: 1; }
    .pb-nt-title { font-size: 16px; font-weight: bold; color: #333; position: relative; z-index: 1; }

    /* hanging */
    &.pb-nt-variant-hanging { display: flex; flex-direction: column; align-items: center; padding: 16px 0 12px; overflow: visible; }
    .pb-nt-hanging-line { width: 1px; height: 20px; background: #D8A7B1; }
    .pb-nt-hanging-circle { width: 48px; height: 48px; border-radius: 50%; background: #B98A94; color: #fff; font-size: 20px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
    .pb-nt-hanging-title { margin-top: 10px; font-size: 17px; font-weight: bold; color: #8C6A72; border-bottom: 1px solid #B98A94; padding-bottom: 4px; }

    /* badge */
    &.pb-nt-variant-badge { display: flex; justify-content: center; align-items: center; padding: 16px 0 12px; overflow: visible; }
    .pb-nt-badge-block { width: 44px; height: 44px; background: #1A1A1A; border-radius: 6px; color: #fff; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pb-nt-badge-title { margin-left: 10px; border: 1px solid #1A1A1A; border-radius: 4px; padding: 6px 14px; background: #fff; font-size: 16px; font-weight: bold; color: #1A1A1A; }
  }

  /* ========== 左图右文 ========== */
  .pb-image-text-row {
    display: flex; align-items: center; padding: 12px 0; margin-bottom: 12px;
    .pb-itr-img {
      width: 40%; height: 100px; flex-shrink: 0; border-radius: 6px; overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .pb-itr-divider {
      width: 3px; height: 60px;
      background: linear-gradient(180deg, #FF6B9D 0%, rgba(255,107,157,0.2) 100%);
      border-radius: 2px; margin: 0 12px; flex-shrink: 0;
    }
    .pb-itr-text { flex: 1; font-size: 14px; color: #333; line-height: 1.6; }
  }

  /* ========== 全宽图片 ========== */
  .pb-full-image {
    position: relative; margin-bottom: 12px;
    img { width: 100%; border-radius: 6px; display: block; }
    .pb-fi-label {
      position: absolute; left: 50%; transform: translateX(-50%);
      background: #FF6B9D; color: #fff; font-size: 12px;
      padding: 4px 12px; border-radius: 10px;
      &.pb-fi-top { top: 8px; }
      &.pb-fi-middle { top: 50%; transform: translate(-50%, -50%); }
      &.pb-fi-bottom { bottom: 8px; }
    }
  }

  /* ========== 全宽出血图 ========== */
  .pb-full-bleed {
    margin: 0 -16px 12px;
    img { width: 100%; display: block; }
  }

  /* ========== 图文叠加 ========== */
  .pb-image-overlay {
    position: relative; margin-bottom: 12px;
    img { width: 100%; border-radius: 6px; display: block; }
    .pb-io-overlay {
      padding: 8px 12px; font-size: 14px;
      &.pb-io-top { border-radius: 6px 6px 0 0; }
      &.pb-io-bottom { border-radius: 0 0 6px 6px; }
      &.pb-io-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 6px; }
    }
  }

  /* ========== 场景氛围卡片 ========== */
  .pb-scene-card {
    border-radius: 10px; overflow: hidden; margin-bottom: 12px;
    background-size: cover; background-position: center; background-color: #ddd;
    min-height: 200px;
    .pb-sc-overlay {
      background: rgba(0,0,0,0.3); min-height: 200px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 16px;
    }
    .pb-sc-text { color: #fff; font-size: 14px; line-height: 1.6; text-align: center; }
    .pb-sc-images { display: flex; gap: 8px; margin-top: 12px; }
    .pb-sc-img { width: 60px; height: 60px; border-radius: 6px; object-fit: cover; }
  }

  /* ========== 纯文本 ========== */
  .pb-text { padding: 4px 0; margin-bottom: 12px; line-height: 1.8; white-space: pre-wrap; }

  /* ========== 引用 ========== */
  .pb-quote { padding: 8px 0; margin-bottom: 12px;
    .pb-bq-icon { font-size: 12px; color: #ccc; }
    .pb-bq-text { font-size: 13px; color: #999; margin: 0 2px; }
    &.pb-quote-left { text-align: left; }
    &.pb-quote-right { text-align: right; }

    &.pb-qv-card {
      display: flex; align-items: flex-start; background: #FFF5F8;
      border-radius: 6px; padding: 14px 16px; text-align: left;
    }
    .pb-bq-card-bar { width: 3px; min-height: 24px; border-radius: 2px; background: #FF6B9D; margin-right: 10px; flex-shrink: 0; align-self: stretch; }
    .pb-bq-card-text { font-size: 14px; color: #555; line-height: 1.8; flex: 1; }
  }

  /* ========== 高亮标签 ========== */
  .pb-highlight-tag { margin-bottom: 12px;
    &.pb-inline { display: inline-block; margin-bottom: 0; margin-right: 6px; }
    .pb-ht-tag { display: inline-block; background: #FF6B9D; color: #fff; font-size: 13px; padding: 3px 10px; border-radius: 4px;
      &.pb-ht-outline { background: transparent; border: 1px solid; }
    }
  }

  /* ========== 对话气泡 ========== */
  .pb-bubble { margin-bottom: 12px;
    &.pb-bubble-left { display: flex; flex-direction: column; align-items: flex-start; }
    &.pb-bubble-center { display: flex; flex-direction: column; align-items: center; }
    &.pb-bubble-right { display: flex; flex-direction: column; align-items: flex-end; }
    .pb-bb-bubble { border-radius: 8px; padding: 12px 16px; max-width: 80%;
      .pb-bb-text { color: #fff; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    }
    .pb-bb-arrow { width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent;
      &.pb-arrow-down { border-top: 6px solid; }
      &.pb-arrow-up { order: -1; border-bottom: 6px solid; border-top: none; }
      &.pb-arrow-left, &.pb-arrow-right { display: none; }
    }
  }

  /* ========== 照片网格 ========== */
  .pb-gallery { margin-bottom: 12px;
    .pb-bg-grid { display: grid; }
    .pb-bg-img-wrap { width: 100%; aspect-ratio: 1; position: relative; border-radius: 6px; overflow: hidden;
      &.pb-bg-polaroid { background: #fff; padding: 8px 8px 0; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); height: auto; aspect-ratio: auto; overflow: visible; }
    }
    .pb-bg-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
    .pb-bg-text { display: block; text-align: center; font-size: 13px; color: #999; margin-top: 6px; }
    .pb-bg-polaroid-caption { display: block; text-align: center; font-size: 11px; color: #999; padding: 6px 0; }
    .pb-img-square-polaroid { width: 100%; aspect-ratio: 1; }
  }

  /* ========== 联系信息 ========== */
  .pb-contact {
    display: flex; flex-direction: column; align-items: center; padding: 12px 0; margin-bottom: 12px;
    .pb-bc-divider { width: 60px; height: 2px; border-radius: 1px; background: linear-gradient(90deg, #81C784 0%, #FFD54F 100%); margin-bottom: 12px; }
    .pb-bc-phone { display: flex; align-items: center; margin-bottom: 10px;
      .pb-bc-label { font-size: 14px; color: #999; }
      .pb-bc-number { font-size: 18px; font-weight: bold; color: #555; }
    }
    .pb-bc-qrcode { width: 100px; height: 100px; margin-bottom: 8px; object-fit: contain; }
    .pb-bc-source { font-size: 11px; color: #999; }
  }

  /* ========== 分割线 ========== */
  .pb-divider { margin-bottom: 12px;
    .pb-divider-line { height: 1px;
      &.pb-divider-default { background: #e0e0e0; }
      &.pb-divider-colorful { height: 2px; background: linear-gradient(90deg, #81C784 0%, #FFD54F 100%); border-radius: 1px; }
      &.pb-divider-dashed { height: 1px; background: repeating-linear-gradient(90deg, #DDD 0, #DDD 8px, transparent 8px, transparent 14px); }
    }
    .pb-divider-dots { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 8px 0;
      .pb-divider-dot { width: 8px; height: 8px; border-radius: 50%;
        &.pb-divider-dot-1 { background: #FFD6E4; }
        &.pb-divider-dot-2 { background: #FFB3C7; }
        &.pb-divider-dot-3 { background: #FF85A8; }
        &.pb-divider-dot-4 { background: #FF6B9D; }
        &.pb-divider-dot-5 { background: #F0447C; }
      }
    }
    .pb-divider-end { display: block; text-align: center; font-size: 12px; color: #BBB; letter-spacing: 4px; padding: 8px 0; }
  }

  /* ========== 流程时间轴 ========== */
  .pb-timeline {
    padding: 0 8px; margin-bottom: 12px;

    .pb-tl-item { display: flex; align-items: flex-start; }

    .pb-tl-badge-wrap {
      display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
    }

    .pb-tl-badge {
      width: 36px; height: 36px; border-radius: 50%;
      background: #FF6B9D; color: #fff; font-weight: bold;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      font-size: 13px;
    }

    .pb-tl-line {
      width: 2px; flex: 1; min-height: 12px;
      &.pb-tl-line-dark { background: #FFD6E4; }
      &.pb-tl-line-light { background: #FFE4EC; }
    }

    .pb-tl-card {
      flex: 1; margin-left: 12px; border-radius: 8px; padding: 14px 16px; margin-bottom: 4px;

      &.pb-tl-card-dark { background: #1A1A1A; .pb-tl-time, .pb-tl-text { color: #FFFFFF; } }
      &.pb-tl-card-light { background: #FFFFFF; border: 1px solid #EEEEEE; .pb-tl-time { color: #333333; } .pb-tl-text { color: #333333; } }

      .pb-tl-time { display: block; font-size: 15px; font-weight: bold; margin-bottom: 4px; }
      .pb-tl-text { display: block; font-size: 14px; line-height: 1.6; }
    }
  }

  /* ========== 圆字标题 ========== */
  .pb-circle-title {
    display: flex; flex-direction: column; align-items: center;
    padding: 16px 0 12px; margin-bottom: 12px;

    .pb-ct-chars { display: flex; gap: 8px; }

    .pb-ct-char {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 15px; font-weight: bold;
    }

    .pb-ct-deco { width: 60px; height: 2px; border-radius: 1px; margin-top: 10px; }
  }

  /* ========== 信息卡 375px ========== */
  .pb-info-card {
    border-radius: 8px; padding: 16px; position: relative; margin-bottom: 12px;

    .pb-ic-tab-row {
      position: absolute; top: -12px; left: 50%;
      transform: translateX(-50%); display: flex; gap: 6px;
    }

    .pb-ic-tab-char {
      width: 24px; height: 24px; border-radius: 50%;
      color: #fff; font-size: 12px; font-weight: bold;
      display: flex; align-items: center; justify-content: center;
    }

    .pb-ic-item {
      display: flex; align-items: flex-start; margin-top: 12px;

      &:first-child { margin-top: 14px; }
    }

    .pb-ic-num {
      width: 20px; height: 20px; border-radius: 50%; color: #fff;
      font-size: 13px; font-weight: bold;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-right: 10px; margin-top: 1px;
    }

    .pb-ic-text {
      font-size: 14px; line-height: 1.6;
      .pb-ic-label { font-weight: bold; }
    }

    .pb-ic-tag {
      min-width: 75px; text-align: center; padding: 4px 8px;
      border-radius: 4px; color: #fff; font-size: 13px;
      font-weight: bold; flex-shrink: 0; margin-right: 10px;
    }

    .pb-ic-value { font-size: 14px; line-height: 1.6; flex: 1; }
  }

  /* ========== 多码报名卡 375px ========== */
  .pb-qr-group {
    background: #fff; border-radius: 8px; padding: 16px;
    border: 1px solid #F0F0F0; margin-bottom: 12px;

    .pb-qg-title {
      display: block; text-align: center; font-size: 15px;
      font-weight: bold; color: #333; margin-bottom: 12px;
    }

    .pb-qg-items { display: flex; justify-content: space-around; }

    .pb-qg-item { display: flex; flex-direction: column; align-items: center; }

    .pb-qg-qrcode { width: 90px; height: 90px; object-fit: contain; }

    .pb-qg-qrcode-empty {
      width: 90px; height: 90px; background: #F5F5F5; border-radius: 4px;
    }

    .pb-qg-name { font-size: 12px; color: #555; margin-top: 6px; text-align: center; }

    .pb-qg-note {
      display: block; text-align: center; font-size: 13px;
      color: #FF6B9D; margin-top: 12px;
    }
  }
}
</style>
