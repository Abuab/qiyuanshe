<template>
  <div class="block-editor">
    <!-- 顶部操作栏 -->
    <div class="editor-toolbar">
      <el-button type="primary" size="small" @click="openAddDialog">
        <el-icon><Plus /></el-icon>添加组件
      </el-button>
    </div>

    <!-- 组件列表 -->
    <div class="block-list" v-if="blocks.length > 0">
      <div
        v-for="(block, index) in blocks"
        :key="block.id"
        class="block-card"
        :class="{ expanded: expandedId === block.id }"
      >
        <!-- 卡片主体 -->
        <div class="block-card-header" @click="toggleExpand(block.id)">
          <span class="block-drag-handle" title="拖拽排序">
            <el-icon><Rank /></el-icon>
          </span>
          <span class="block-type-icon">
            <el-icon><component :is="typeIconMap[block.type] || Document" /></el-icon>
          </span>
          <span class="block-type-name">{{ typeLabelMap[block.type] || block.type }}</span>
          <span class="block-preview">{{ getPreview(block) }}</span>
          <span class="block-actions">
            <el-button
              v-if="index > 0"
              size="small"
              text
              @click.stop="moveBlock(index, -1)"
              title="上移"
            >
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button
              v-if="index < blocks.length - 1"
              size="small"
              text
              @click.stop="moveBlock(index, 1)"
              title="下移"
            >
              <el-icon><Bottom /></el-icon>
            </el-button>
            <el-button
              size="small"
              text
              type="warning"
              @click.stop="toggleExpand(block.id)"
              title="编辑"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click.stop="removeBlock(index)"
              title="删除"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
            <el-button
              size="small"
              text
              type="info"
              @click.stop="copyBlock(index)"
              title="复制"
            >
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </span>
        </div>

        <!-- 展开编辑区域 -->
        <el-collapse-transition>
          <div v-if="expandedId === block.id" class="block-edit-area">
            <el-form label-width="80px" size="small" @click.stop>

              <!-- text -->
              <template v-if="block.type === 'text'">
                <el-form-item label="文字内容">
                  <el-input v-model="block.content" type="textarea" :rows="3" />
                </el-form-item>
                <el-form-item label="对齐方式">
                  <el-radio-group v-model="block.align">
                    <el-radio label="left">左对齐</el-radio>
                    <el-radio label="center">居中</el-radio>
                    <el-radio label="right">右对齐</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="文字颜色">
                  <el-color-picker v-model="block.color" />
                </el-form-item>
              </template>

              <!-- image -->
              <template v-if="block.type === 'image' || block.type === 'full_image'">
                <el-form-item label="图片">
                  <div class="upload-row">
                    <el-image
                      v-if="block.url"
                      :src="block.url"
                      fit="cover"
                      class="thumb-preview"
                    />
                    <el-upload
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="(file: any) => handleImageUpload(file, index, 'url')"
                    >
                      <el-button size="small" type="primary">上传图片</el-button>
                    </el-upload>
                  </div>
                </el-form-item>
                <el-form-item label="图片说明">
                  <el-input v-model="block.caption" />
                </el-form-item>
                <el-form-item label="角标位置">
                  <el-radio-group v-model="block.labelPosition">
                    <el-radio label="top">顶部</el-radio>
                    <el-radio label="middle">居中</el-radio>
                    <el-radio label="bottom">底部</el-radio>
                  </el-radio-group>
                </el-form-item>
              </template>

              <!-- full_bleed_image -->
              <template v-if="block.type === 'full_bleed_image'">
                <el-form-item label="图片">
                  <div class="upload-row">
                    <el-image
                      v-if="block.imageUrl"
                      :src="block.imageUrl"
                      fit="cover"
                      class="thumb-preview"
                    />
                    <el-upload
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="(file: any) => handleImageUpload(file, index, 'imageUrl')"
                    >
                      <el-button size="small" type="primary">上传图片</el-button>
                    </el-upload>
                  </div>
                </el-form-item>
                <el-form-item label="提示">
                  <span class="form-tip-inline">图片将撑满屏幕宽度，左右无留白、无圆角</span>
                </el-form-item>
              </template>

              <!-- image_text_row -->
              <template v-if="block.type === 'image_text_row'">
                <el-form-item label="图片">
                  <div class="upload-row">
                    <el-image
                      v-if="block.imageUrl"
                      :src="block.imageUrl"
                      fit="cover"
                      class="thumb-preview"
                    />
                    <el-upload
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="(file: any) => handleImageUpload(file, index, 'imageUrl')"
                    >
                      <el-button size="small" type="primary">上传图片</el-button>
                    </el-upload>
                  </div>
                </el-form-item>
                <el-form-item label="文字内容">
                  <el-input v-model="block.text" type="textarea" :rows="3" />
                </el-form-item>
                <el-form-item label="对齐方式">
                  <el-radio-group v-model="block.alignment">
                    <el-radio label="left">左对齐</el-radio>
                    <el-radio label="center">居中</el-radio>
                    <el-radio label="right">右对齐</el-radio>
                  </el-radio-group>
                </el-form-item>
              </template>

              <!-- scene_card -->
              <template v-if="block.type === 'scene_card'">
                <el-form-item label="背景图">
                  <div class="upload-row">
                    <el-image
                      v-if="block.bgImage"
                      :src="block.bgImage"
                      fit="cover"
                      class="thumb-preview"
                    />
                    <el-upload
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="(file: any) => handleImageUpload(file, index, 'bgImage')"
                    >
                      <el-button size="small" type="primary">上传背景图</el-button>
                    </el-upload>
                  </div>
                </el-form-item>
                <el-form-item label="文字内容">
                  <el-input v-model="block.innerText" type="textarea" :rows="3" placeholder="居中显示在背景图上方" />
                </el-form-item>
                <el-form-item label="小图列表">
                  <div class="gallery-upload">
                    <div
                      v-for="(img, si) in block.innerImages"
                      :key="si"
                      class="gallery-thumb"
                    >
                      <el-image :src="img" fit="cover" class="thumb-preview" />
                      <el-button
                        size="small"
                        type="danger"
                        :icon="Close"
                        circle
                        class="gallery-remove-btn"
                        @click="block.innerImages.splice(si, 1)"
                      />
                    </div>
                    <el-upload
                      v-if="(block.innerImages || []).length < 4"
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="(file: any) => handleSceneImageUpload(file, index)"
                    >
                      <div class="gallery-add-btn">
                        <el-icon :size="24"><Plus /></el-icon>
                      </div>
                    </el-upload>
                  </div>
                </el-form-item>
              </template>

              <!-- numbered_title -->
              <template v-if="block.type === 'numbered_title'">
                <el-form-item label="编号">
                  <el-input v-model="block.number" placeholder="如 01" maxlength="4" style="width: 120px" />
                </el-form-item>
                <el-form-item label="标题">
                  <el-input v-model="block.title" placeholder="如 活动签到" maxlength="20" />
                </el-form-item>
              </template>

              <!-- quote -->
              <template v-if="block.type === 'quote'">
                <el-form-item label="引用文字">
                  <el-input v-model="block.content" type="textarea" :rows="3" placeholder="如「明天周末可以约你去下一站吗？」" />
                </el-form-item>
                <el-form-item label="对齐方式">
                  <el-radio-group v-model="block.alignment">
                    <el-radio label="left">左对齐</el-radio>
                    <el-radio label="right">右对齐</el-radio>
                  </el-radio-group>
                </el-form-item>
              </template>

              <!-- highlight_tag -->
              <template v-if="block.type === 'highlight_tag'">
                <el-form-item label="标签文字">
                  <el-input v-model="block.text" placeholder="如 会员免费" maxlength="20" />
                </el-form-item>
                <el-form-item label="行内显示">
                  <el-switch v-model="block.inline" />
                  <span class="form-tip-inline">开启后标签不换行，可与其他内容同行</span>
                </el-form-item>
              </template>

              <!-- image_overlay -->
              <template v-if="block.type === 'image_overlay'">
                <el-form-item label="背景图">
                  <div class="upload-row">
                    <el-image
                      v-if="block.url"
                      :src="block.url"
                      fit="cover"
                      class="thumb-preview"
                    />
                    <el-upload
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="(file: any) => handleImageUpload(file, index, 'url')"
                    >
                      <el-button size="small" type="primary">上传图片</el-button>
                    </el-upload>
                  </div>
                </el-form-item>
                <el-form-item label="叠加文字">
                  <el-input v-model="block.text" type="textarea" :rows="2" />
                </el-form-item>
                <el-form-item label="文字位置">
                  <el-radio-group v-model="block.position">
                    <el-radio label="center">居中</el-radio>
                    <el-radio label="top">顶部</el-radio>
                    <el-radio label="bottom">底部</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="文字颜色">
                  <el-color-picker v-model="block.textColor" />
                </el-form-item>
                <el-form-item label="遮罩颜色">
                  <el-input v-model="block.bgOverlay" />
                </el-form-item>
              </template>

              <!-- bubble -->
              <template v-if="block.type === 'bubble'">
                <el-form-item label="气泡文字">
                  <el-input v-model="block.text" type="textarea" :rows="2" />
                </el-form-item>
                <el-form-item label="气泡颜色">
                  <el-color-picker v-model="block.color" />
                </el-form-item>
                <el-form-item label="箭头方向">
                  <el-radio-group v-model="block.arrow">
                    <el-radio label="down">向下</el-radio>
                    <el-radio label="up">向上</el-radio>
                    <el-radio label="left">向左</el-radio>
                    <el-radio label="right">向右</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="对齐方式">
                  <el-radio-group v-model="block.align">
                    <el-radio label="left">左对齐</el-radio>
                    <el-radio label="center">居中</el-radio>
                    <el-radio label="right">右对齐</el-radio>
                  </el-radio-group>
                </el-form-item>
              </template>

              <!-- gallery -->
              <template v-if="block.type === 'gallery'">
                <el-form-item label="图片列表">
                  <div class="gallery-upload">
                    <div
                      v-for="(img, gi) in block.images"
                      :key="gi"
                      class="gallery-thumb"
                    >
                      <el-image :src="img" fit="cover" class="thumb-preview" />
                      <el-button
                        size="small"
                        type="danger"
                        :icon="Close"
                        circle
                        class="gallery-remove-btn"
                        @click="removeGalleryImage(index, gi)"
                      />
                    </div>
                    <el-upload
                      v-if="(block.images || []).length < 8"
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      multiple
                      :on-change="(file: any) => handleGalleryMultiUpload(file, index)"
                    >
                      <div class="gallery-add-btn">
                        <el-icon :size="24"><Plus /></el-icon>
                      </div>
                    </el-upload>
                  </div>
                </el-form-item>
                <el-form-item label="列数">
                  <el-input-number v-model="block.columns" :min="1" :max="4" />
                </el-form-item>
                <el-form-item label="文字叠加">
                  <el-input v-model="block.textOverlay" />
                </el-form-item>
              </template>

              <!-- contact -->
              <template v-if="block.type === 'contact'">
                <el-form-item label="电话">
                  <el-input v-model="block.phone" />
                </el-form-item>
                <el-form-item label="二维码">
                  <div class="upload-row">
                    <el-image
                      v-if="block.qrCode"
                      :src="block.qrCode"
                      fit="cover"
                      class="thumb-preview"
                    />
                    <el-upload
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="(file: any) => handleImageUpload(file, index, 'qrCode')"
                    >
                      <el-button size="small" type="primary">上传二维码</el-button>
                    </el-upload>
                  </div>
                </el-form-item>
                <el-form-item label="来源">
                  <el-input v-model="block.source" />
                </el-form-item>
              </template>

              <!-- divider -->
              <template v-if="block.type === 'divider'">
                <el-form-item label="样式">
                  <el-radio-group v-model="block.style">
                    <el-radio label="default">默认</el-radio>
                    <el-radio label="colorful">彩色</el-radio>
                  </el-radio-group>
                </el-form-item>
              </template>

              <!-- title -->
              <template v-if="block.type === 'title'">
                <el-form-item label="主标题">
                  <el-input v-model="block.mainTitle" />
                </el-form-item>
                <el-form-item label="副标题">
                  <el-input v-model="block.subTitle" />
                </el-form-item>
                <el-form-item label="背景渐变">
                  <el-select v-model="block.bgColor" style="width: 100%">
                    <el-option label="🌸 甜粉渐变 (pink)" value="pink" />
                    <el-option label="💜 梦幻紫渐变 (purple)" value="purple" />
                    <el-option label="💙 清新蓝渐变 (blue)" value="blue" />
                  </el-select>
                </el-form-item>
                <el-form-item label="自定义背景">
                  <el-input v-model="block.bgColor" placeholder="或输入自定义 CSS 值（如 linear-gradient(...)）" />
                  <span class="form-tip-inline">留空使用默认粉色渐变；可输入任意 CSS 渐变值覆盖预设</span>
                </el-form-item>
                <el-form-item label="文字颜色">
                  <el-color-picker v-model="block.textColor" />
                </el-form-item>
              </template>

              <el-form-item>
                <el-button size="small" @click="expandedId = ''">收起</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-collapse-transition>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="block-empty">
      <el-icon :size="40"><Picture /></el-icon>
      <p>暂无内容，点击上方按钮添加</p>
    </div>

    <!-- 添加组件弹窗 -->
    <el-dialog v-model="addDialogVisible" title="选择组件类型" width="480px">
      <div class="block-editor-type-grid">
        <div
          v-for="t in blockTypes"
          :key="t.type"
          class="type-item"
          @click="addBlock(t.type)"
        >
          <span class="type-item-icon">
            <el-icon :size="28"><component :is="t.icon" /></el-icon>
          </span>
          <span class="type-item-name">{{ t.label }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document, Picture, PictureFilled, ChatDotRound, Grid, Phone, Minus, Trophy,
  Plus, Top, Bottom, Edit, Delete, Close,
  Sort, Reading, ChatLineSquare, PriceTag, FullScreen, Crop, Film, StarFilled,
  Rank, CopyDocument,
} from '@element-plus/icons-vue'
import { adminActivity } from '../../api'

interface Block {
  id: string
  type: string
  [key: string]: any
}

const props = defineProps<{
  modelValue: Block[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Block[]]
}>()

const blocks = ref<Block[]>([...props.modelValue])
const expandedId = ref('')
const addDialogVisible = ref(false)

let suppressEmit = false

watch(() => props.modelValue, (val) => {
  suppressEmit = true
  blocks.value = [...val]
  nextTick(() => { suppressEmit = false })
})

watch(blocks, (val) => {
  if (suppressEmit) return
  emit('update:modelValue', [...val])
}, { deep: true })

// 组件类型定义（与 C 端 BlockRenderer.vue 16 种类型对齐）
const blockTypes = [
  { type: 'text', label: '文本段落', icon: Document },
  { type: 'image', label: '单张图片', icon: Picture },
  { type: 'full_image', label: '全宽角标图', icon: Crop },
  { type: 'full_bleed_image', label: '全宽出血图', icon: FullScreen },
  { type: 'image_overlay', label: '图文叠加', icon: PictureFilled },
  { type: 'image_text_row', label: '左图右文', icon: Reading },
  { type: 'scene_card', label: '场景卡片', icon: Film },
  { type: 'bubble', label: '对话气泡', icon: ChatDotRound },
  { type: 'gallery', label: '照片网格', icon: Grid },
  { type: 'numbered_title', label: '编号标题', icon: Sort },
  { type: 'title', label: '装饰标题', icon: Trophy },
  { type: 'quote', label: '引用文字', icon: ChatLineSquare },
  { type: 'highlight_tag', label: '高亮标签', icon: PriceTag },
  { type: 'contact', label: '联系信息', icon: Phone },
  { type: 'divider', label: '分割线', icon: Minus },
]

const typeIconMap: Record<string, any> = {
  text: Document, image: Picture, full_image: Crop, full_bleed_image: FullScreen,
  image_overlay: PictureFilled, image_text_row: Reading, scene_card: Film,
  bubble: ChatDotRound, gallery: Grid, numbered_title: Sort,
  title: Trophy, decorative_title: StarFilled,
  quote: ChatLineSquare, highlight_tag: PriceTag,
  contact: Phone, divider: Minus,
}

const typeLabelMap: Record<string, string> = {
  text: '文本段落', image: '单张图片', full_image: '全宽角标图', full_bleed_image: '全宽出血图',
  image_overlay: '图文叠加', image_text_row: '左图右文', scene_card: '场景卡片',
  bubble: '对话气泡', gallery: '照片网格', numbered_title: '编号标题',
  title: '装饰标题', decorative_title: '装饰标题(旧)',
  quote: '引用文字', highlight_tag: '高亮标签',
  contact: '联系信息', divider: '分割线',
}

function uuid(): string {
  return 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function getDefaultForType(type: string): Block {
  const id = uuid()
  const defaults: Record<string, any> = {
    text: { content: '', align: 'center', color: '#666666' },
    image: { url: '', caption: '', labelPosition: 'bottom' },
    full_image: { url: '', caption: '', labelPosition: 'bottom' },
    full_bleed_image: { imageUrl: '' },
    image_overlay: { url: '', text: '', position: 'center', textColor: '#FFFFFF', bgOverlay: 'rgba(0,0,0,0.35)' },
    image_text_row: { imageUrl: '', text: '', alignment: 'left' },
    scene_card: { bgImage: '', innerText: '', innerImages: [] },
    bubble: { text: '', color: '#FFB74D', arrow: 'down', align: 'center' },
    gallery: { images: [], columns: 2, textOverlay: '', gap: 16 },
    numbered_title: { number: '01', title: '活动签到' },
    title: { mainTitle: '', subTitle: '', bgColor: 'pink', textColor: '#FFFFFF' },
    quote: { content: '', alignment: 'left' },
    highlight_tag: { text: '', inline: false },
    contact: { phone: '', qrCode: '', source: '' },
    divider: { style: 'default' },
  }
  return { id, type, ...defaults[type] }
}

function getPreview(block: Block): string {
  switch (block.type) {
    case 'text': return (block.content || '').slice(0, 20) || '(空)'
    case 'image': case 'full_image': return block.url ? '已上传图片' : '(空)'
    case 'full_bleed_image': return block.imageUrl ? '已上传图片' : '(空)'
    case 'image_overlay': return block.text ? block.text.slice(0, 15) : '(空)'
    case 'image_text_row': return block.text ? block.text.slice(0, 15) : '(空)'
    case 'scene_card': return block.innerText ? block.innerText.slice(0, 15) : '(空)'
    case 'bubble': return block.text ? block.text.slice(0, 15) : '(空)'
    case 'gallery': return `${(block.images || []).length} 张图片`
    case 'numbered_title': return `#${block.number || '?'} ${block.title || '(空)'}`
    case 'title': case 'decorative_title': return block.mainTitle || '(空)'
    case 'quote': return block.content ? '「' + block.content.slice(0, 20) + '」' : '(空)'
    case 'highlight_tag': return block.text ? '#' + block.text.slice(0, 15) : '(空)'
    case 'contact': return block.phone || '(空)'
    case 'divider': return block.style === 'colorful' ? '彩色分割线' : '默认分割线'
    default: return ''
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? '' : id
}

function openAddDialog() {
  addDialogVisible.value = true
}

function addBlock(type: string) {
  blocks.value.push(getDefaultForType(type))
  addDialogVisible.value = false
  // 自动展开新添加的组件
  const newBlock = blocks.value[blocks.value.length - 1]
  expandedId.value = newBlock.id
}

function removeBlock(index: number) {
  ElMessageBox.confirm('确认删除此组件？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    if (expandedId.value === blocks.value[index].id) {
      expandedId.value = ''
    }
    blocks.value.splice(index, 1)
    ElMessage.success('已删除')
  }).catch(() => {})
}

function moveBlock(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= blocks.value.length) return
  const item = blocks.value[index]
  blocks.value.splice(index, 1)
  blocks.value.splice(newIndex, 0, item)
}

function copyBlock(index: number) {
  const clone = JSON.parse(JSON.stringify(blocks.value[index]))
  clone.id = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
  blocks.value.splice(index + 1, 0, clone)
  expandedId.value = clone.id
  ElMessage.success('已复制')
}

// 文件上传前校验：不超过 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

function validateFileSize(file: File): boolean {
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error(`图片「${file.name}」超过 10MB 限制，请压缩后重新上传`)
    return false
  }
  return true
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await adminActivity.upload(formData)
  if (res.success && res.data?.url) {
    return res.data.url
  }
  throw new Error('上传失败')
}

async function handleImageUpload(fileItem: any, blockIndex: number, field: string) {
  const file = fileItem.raw as File
  if (!file) return
  if (!validateFileSize(file)) return
  try {
    ElMessage.info('正在上传图片...')
    const url = await uploadFile(file)
    blocks.value[blockIndex][field] = url
    ElMessage.success('上传成功')
  } catch (e) {
    console.error(e)
    ElMessage.error('上传失败')
  }
}

// gallery 多图上传（支持 multiple）
async function handleGalleryMultiUpload(fileItem: any, blockIndex: number) {
  const rawFiles: File[] = Array.isArray(fileItem) ? fileItem : [fileItem.raw as File]
  if (rawFiles.length === 0 || !rawFiles[0]) return

  let successCount = 0
  const total = rawFiles.length
  ElMessage.info(`正在上传 ${total} 张图片...`)

  for (const file of rawFiles) {
    if (!validateFileSize(file)) continue
    try {
      const url = await uploadFile(file)
      if (!blocks.value[blockIndex].images) {
        blocks.value[blockIndex].images = []
      }
      blocks.value[blockIndex].images.push(url)
      successCount++
    } catch (e) {
      console.error(e)
    }
  }

  if (successCount > 0) {
    ElMessage.success(`成功上传 ${successCount}/${total} 张`)
  } else {
    ElMessage.error('全部上传失败')
  }
}

function removeGalleryImage(blockIndex: number, imageIndex: number) {
  blocks.value[blockIndex].images.splice(imageIndex, 1)
}

async function handleSceneImageUpload(fileItem: any, blockIndex: number) {
  const file = fileItem.raw as File
  if (!file) return
  if (!validateFileSize(file)) return
  try {
    ElMessage.info('正在上传图片...')
    const url = await uploadFile(file)
    if (!blocks.value[blockIndex].innerImages) {
      blocks.value[blockIndex].innerImages = []
    }
    blocks.value[blockIndex].innerImages.push(url)
    ElMessage.success('上传成功')
  } catch (e) {
    console.error(e)
    ElMessage.error('上传失败')
  }
}
</script>

<style lang="scss" scoped>
.block-editor {
  .editor-toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }

  .block-list {
    .block-card {
      background: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: box-shadow 0.2s;

      &:hover {
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      }

      &.expanded {
        border-color: #409EFF;
      }

      .block-card-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        gap: 10px;

        .block-drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          color: #c0c4cc;

          &:active { cursor: grabbing; }
          &:hover { color: #409EFF; }
        }

        .block-type-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: #f0f2f5;
          color: #606266;
          flex-shrink: 0;
        }

        .block-type-name {
          font-size: 13px;
          font-weight: 500;
          color: #303133;
          flex-shrink: 0;
          min-width: 60px;
        }

        .block-preview {
          flex: 1;
          font-size: 12px;
          color: #909399;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .block-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
      }

      .block-edit-area {
        border-top: 1px solid #ebeef5;
        padding: 16px;
        background: #fafafa;
      }
    }
  }

  .block-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
    color: #c0c4cc;

    p {
      margin-top: 12px;
      font-size: 14px;
    }
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .form-tip-inline {
    margin-left: 12px;
    color: #909399;
    font-size: 12px;
    line-height: 32px;
  }

  .thumb-preview {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    border: 1px solid #e4e7ed;
    object-fit: cover;
  }

  .gallery-upload {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .gallery-thumb {
      position: relative;
      width: 80px;
      height: 80px;

      .gallery-remove-btn {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 18px;
        height: 18px;
      }
    }

    .gallery-add-btn {
      width: 80px;
      height: 80px;
      border: 2px dashed #dcdfe6;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #c0c4cc;
      transition: border-color 0.2s, color 0.2s;

      &:hover {
        border-color: #409EFF;
        color: #409EFF;
      }
    }
  }
}
</style>

<!-- 非 scoped 样式：type-grid 在 el-dialog（teleport）中 -->
<style lang="scss">
.block-editor-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  .type-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 12px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #409EFF;
      background-color: #ecf5ff;
    }

    .type-item-icon {
      color: #409EFF;
      margin-bottom: 8px;
    }

    .type-item-name {
      font-size: 12px;
      color: #606266;
    }
  }
}
</style>
