<template>
  <div class="block-editor">
    <!-- 顶部操作栏 -->
    <div class="editor-toolbar">
      <el-button type="primary" size="small" @click="openAddDialog">
        <el-icon><Plus /></el-icon>添加组件
      </el-button>
      <el-dropdown
        v-if="showTemplate"
        trigger="click"
        @command="applyTemplate"
        style="margin-left: 12px"
      >
        <el-button size="small">
          应用预设模板<el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="party">🎉 派对回顾模板</el-dropdown-item>
            <el-dropdown-item command="simple">✨ 简约活动模板</el-dropdown-item>
            <el-dropdown-item command="signup">📢 报名号召模板</el-dropdown-item>
            <el-dropdown-item command="clear" divided>🗑️ 清空内容</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
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
              <template v-if="block.type === 'image'">
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
                      :on-change="(file: any) => handleGalleryUpload(file, index)"
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
                <el-form-item label="背景颜色">
                  <el-input v-model="block.bgColor" />
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
      <div class="type-grid">
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
  Plus, ArrowDown, Top, Bottom, Edit, Delete, Close,
} from '@element-plus/icons-vue'
import { adminActivity } from '../../api'

interface Block {
  id: string
  type: string
  [key: string]: any
}

const props = defineProps<{
  modelValue: Block[]
  showTemplate?: boolean
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

// 组件类型定义
const blockTypes = [
  { type: 'text', label: '文本段落', icon: Document },
  { type: 'image', label: '单张图片', icon: Picture },
  { type: 'image_overlay', label: '图文叠加', icon: PictureFilled },
  { type: 'bubble', label: '对话气泡', icon: ChatDotRound },
  { type: 'gallery', label: '照片网格', icon: Grid },
  { type: 'contact', label: '联系信息', icon: Phone },
  { type: 'divider', label: '分割线', icon: Minus },
  { type: 'title', label: '装饰标题', icon: Trophy },
]

const typeIconMap: Record<string, any> = {
  text: Document, image: Picture, image_overlay: PictureFilled,
  bubble: ChatDotRound, gallery: Grid, contact: Phone,
  divider: Minus, title: Trophy,
}

const typeLabelMap: Record<string, string> = {
  text: '文本段落', image: '单张图片', image_overlay: '图文叠加',
  bubble: '对话气泡', gallery: '照片网格', contact: '联系信息',
  divider: '分割线', title: '装饰标题',
}

function uuid(): string {
  return 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function getDefaultForType(type: string): Block {
  const id = uuid()
  const defaults: Record<string, any> = {
    text: { content: '', align: 'center', color: '#666666' },
    image: { url: '', caption: '' },
    image_overlay: { url: '', text: '', position: 'center', textColor: '#FFFFFF', bgOverlay: 'rgba(0,0,0,0.35)' },
    bubble: { text: '', color: '#FFB74D', arrow: 'down', align: 'center' },
    gallery: { images: [], columns: 2, textOverlay: '', gap: 16 },
    contact: { phone: '', qrCode: '', source: '' },
    divider: { style: 'default' },
    title: { mainTitle: '', subTitle: '', bgColor: 'linear-gradient(135deg, #FF6B9D, #FF85A8)', textColor: '#FFFFFF' },
  }
  return { id, type, ...defaults[type] }
}

function getPreview(block: Block): string {
  switch (block.type) {
    case 'text': return (block.content || '').slice(0, 20) || '(空)'
    case 'image': return block.url ? '已上传图片' : '(空)'
    case 'image_overlay': return block.text ? block.text.slice(0, 15) : '(空)'
    case 'bubble': return block.text ? block.text.slice(0, 15) : '(空)'
    case 'gallery': return `${(block.images || []).length} 张图片`
    case 'contact': return block.phone || '(空)'
    case 'divider': return block.style === 'colorful' ? '彩色分割线' : '默认分割线'
    case 'title': return block.mainTitle || '(空)'
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

async function handleGalleryUpload(fileItem: any, blockIndex: number) {
  const file = fileItem.raw as File
  if (!file) return
  try {
    ElMessage.info('正在上传图片...')
    const url = await uploadFile(file)
    if (!blocks.value[blockIndex].images) {
      blocks.value[blockIndex].images = []
    }
    blocks.value[blockIndex].images.push(url)
    ElMessage.success('上传成功')
  } catch (e) {
    console.error(e)
    ElMessage.error('上传失败')
  }
}

function removeGalleryImage(blockIndex: number, imageIndex: number) {
  blocks.value[blockIndex].images.splice(imageIndex, 1)
}

function applyTemplate(type: string) {
  if (type === 'clear') {
    if (blocks.value.length > 0) {
      ElMessageBox.confirm('确认清空所有内容？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        blocks.value = []
        expandedId.value = ''
        ElMessage.success('已清空')
      }).catch(() => {})
    }
    return
  }

  const apply = (newBlocks: Block[]) => {
    if (blocks.value.length > 0) {
      ElMessageBox.confirm('当前已有内容，是否覆盖？', '提示', {
        confirmButtonText: '确定覆盖',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        blocks.value = newBlocks
        expandedId.value = ''
        ElMessage.success('已应用模板')
      }).catch(() => {})
    } else {
      blocks.value = newBlocks
      ElMessage.success('已应用模板')
    }
  }

  let newBlocks: Block[] = []
  switch (type) {
    case 'party':
      newBlocks = [
        getDefaultForType('bubble'),
        getDefaultForType('text'),
        getDefaultForType('image_overlay'),
        getDefaultForType('bubble'),
        getDefaultForType('gallery'),
        getDefaultForType('divider'),
        getDefaultForType('contact'),
      ]
      // 派对回顾模板默认值
      newBlocks[0].text = '活动现场气氛热烈'
      newBlocks[0].color = '#FFB74D'
      newBlocks[1].content = '感谢每一位到场的嘉宾，共同度过了一个美好的夜晚。'
      newBlocks[3].text = '期待下次再相聚'
      newBlocks[3].color = '#81C784'
      break
    case 'simple':
      newBlocks = [
        getDefaultForType('title'),
        getDefaultForType('text'),
        getDefaultForType('image'),
        getDefaultForType('divider'),
      ]
      newBlocks[0].mainTitle = '活动详情'
      break
    case 'signup':
      newBlocks = [
        getDefaultForType('title'),
        getDefaultForType('text'),
        getDefaultForType('image_overlay'),
        getDefaultForType('contact'),
      ]
      newBlocks[0].mainTitle = '快来报名'
      newBlocks[0].subTitle = '名额有限，先到先得'
      newBlocks[1].content = '心动不如行动，快来加入我们吧！'
      break
  }
  apply(newBlocks)
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

// 添加组件弹窗 - 8宫格
.type-grid {
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
