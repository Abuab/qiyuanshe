<template>
  <div class="activity-edit">
    <div class="page-header">
      <el-button @click="handleBack" :icon="ArrowLeft">返回</el-button>
      <h2 class="page-title">{{ isEdit ? '编辑活动' : '添加活动' }}</h2>
    </div>

    <!-- 基本信息区域 -->
    <el-card class="form-card">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
        </div>
      </template>
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="activity-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="活动标题" prop="title">
              <el-input
                v-model="formData.title"
                placeholder="请输入活动标题"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="副标题" prop="subtitle">
              <el-input
                v-model="formData.subtitle"
                placeholder="显示在海报下方，一句话卖点"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="活动类型" prop="activityType">
              <el-radio-group v-model="formData.activityType">
                <el-radio label="latest">最新活动</el-radio>
                <el-radio label="online">线上互选</el-radio>
                <el-radio label="cp">一周CP</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="顶部样式" prop="headerType">
              <el-radio-group v-model="formData.headerType">
                <el-radio label="poster">大图海报</el-radio>
                <el-radio label="info">信息卡片</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="活动地点" prop="location">
              <el-input
                v-model="formData.location"
                placeholder="请输入活动地点"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker
                v-model="formData.startTime"
                type="datetime"
                placeholder="选择开始时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结束时间" prop="endTime">
              <el-date-picker
                v-model="formData.endTime"
                type="datetime"
                placeholder="选择结束时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="报名截止" prop="signUpEndTime">
              <el-date-picker
                v-model="formData.signUpEndTime"
                type="datetime"
                placeholder="选择报名截止时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="人数上限" prop="maxParticipants">
              <el-input-number v-model="formData.maxParticipants" :min="0" :max="9999" style="width: 100%" />
              <span class="form-tip">0 表示不限人数，C 端显示「不限」</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序" prop="sortOrder">
              <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" style="width: 100%" />
              <span class="form-tip">数字越小越靠前</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="formData.status">
                <el-radio :label="0">草稿</el-radio>
                <el-radio :label="1">进行中</el-radio>
                <el-radio :label="2">已结束</el-radio>
                <el-radio :label="3">已取消</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="Tab 显示">
              <el-checkbox v-model="formData.showDetailTab">显示「活动详情」Tab</el-checkbox>
              <el-checkbox v-model="formData.showSceneTab" style="margin-left: 24px">显示「活动现场」Tab</el-checkbox>
              <span class="form-tip">控制小程序端 Tab 栏显示</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="顶部海报" prop="coverImage">
          <div class="upload-wrapper">
            <el-image
              v-if="formData.coverImage && !coverImageError"
              :src="formData.coverImage"
              fit="cover"
              class="cover-preview"
              @error="handleCoverImageError"
            />
            <div v-else class="cover-placeholder">
              <el-icon :size="40"><Picture /></el-icon>
              <span>暂无海报</span>
            </div>
            <div class="upload-actions">
              <el-button type="primary" @click="triggerUpload">
                <el-icon><Upload /></el-icon>上传海报
              </el-button>
              <p class="upload-tip">建议尺寸：750x400px，支持 JPG、PNG 格式</p>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileChange"
            />
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 信息卡片配置（仅 headerType === 'info' 时显示） -->
    <el-card v-if="formData.headerType === 'info'" class="form-card">
      <template #header>
        <div class="card-header">
          <span>信息卡片配置</span>
        </div>
      </template>
      <el-form label-width="120px" size="small">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="背景颜色">
              <el-color-picker v-model="formData.headerConfig.bgColor" />
              <span class="form-tip">默认粉色渐变</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标签颜色">
              <el-color-picker v-model="formData.headerConfig.tagColor" />
              <span class="form-tip">默认 #FF6B9D</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="显示信息">
          <el-checkbox-group v-model="formData.headerConfig.showTags">
            <el-checkbox label="location">活动地点</el-checkbox>
            <el-checkbox label="time">活动时间</el-checkbox>
            <el-checkbox label="spots">剩余名额</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 积木编辑器区域：左右分栏（编辑器 + 手机预览） -->
    <el-card class="editor-card">
      <template #header>
        <div class="card-header">
          <span>活动详情</span>
          <div class="card-header-right">
            <span class="header-tip">使用积木组件自由排版活动内容</span>
            <el-button size="small" @click="showTemplatePicker = true">
              <el-icon><Files /></el-icon>套用模板
            </el-button>
          </div>
        </div>
      </template>
      <div class="editor-split">
        <!-- 左：积木编辑器 -->
        <div class="editor-left">
          <el-tabs v-model="activeTab" class="block-tabs" @tab-change="onTabChange">
            <el-tab-pane label="活动详情" name="detail">
              <BlockEditor v-model="formData.detailBlocks" />
            </el-tab-pane>
            <el-tab-pane name="scene">
              <template #label>
                <span :class="{ 'tab-label-muted': !formData.showSceneTab }">活动现场</span>
                <el-tooltip v-if="!formData.showSceneTab" content="当前不会在小程序端显示" placement="top">
                  <el-icon class="tab-hint-icon"><WarningFilled /></el-icon>
                </el-tooltip>
              </template>
            <BlockEditor v-model="formData.sceneBlocks" />
            </el-tab-pane>
          </el-tabs>
        </div>
        <!-- 右：手机实时预览 -->
        <div class="editor-right">
          <BlockPreview
            :blocks="previewBlocks"
            :active-block-id="previewActiveBlockId"
            :preview-title="previewTitle"
            @select-block="onPreviewSelectBlock"
          />
        </div>
      </div>
    </el-card>

    <!-- 套用模板弹窗（入口 B） -->
    <el-dialog v-model="showTemplatePicker" title="套用模板" width="900px" :close-on-click-modal="false">
      <div class="template-picker-grid">
        <div
          v-for="tmpl in ACTIVITY_TEMPLATES"
          :key="tmpl.key"
          class="template-picker-card"
          :class="{ selected: pickingTemplateKey === tmpl.key }"
          @click="pickingTemplateKey = tmpl.key"
        >
          <div class="tpc-emoji">{{ tmpl.emoji }}</div>
          <div class="tpc-name">{{ tmpl.name }}</div>
          <div class="tpc-desc">{{ tmpl.description }}</div>
          <div class="tpc-composition">{{ getBlockComposition(tmpl) }}</div>
          <el-tag v-if="tmpl.recommended" type="danger" size="small" class="tpc-tag">推荐</el-tag>
        </div>
      </div>
      <!-- 选中模板后展示积木构成清单 -->
      <div v-if="pickedTemplate" class="template-preview">
        <div class="tp-title">积木构成预览</div>
        <div class="tp-blocks">
          <template v-if="pickedTemplate.detailBlocks.length > 0">
            <div v-for="(b, i) in pickedTemplate.detailBlocks" :key="i" class="tp-block-item">
              <el-tag size="small" type="info">{{ b.type }}</el-tag>
              <span class="tp-block-text">{{ getBlockPreview(b) }}</span>
            </div>
          </template>
          <div v-else class="tp-empty">（空白模板，不添加任何积木）</div>
        </div>
      </div>
      <div v-if="pickedTemplate" class="template-apply-mode">
        <el-radio-group v-model="applyMode">
          <el-radio label="replace">覆盖当前 Tab 内容</el-radio>
          <el-radio label="append">追加到现有内容末尾</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="showTemplatePicker = false">取消</el-button>
        <el-button type="primary" @click="applyPickedTemplate" :disabled="!pickedTemplate">
          确认套用
        </el-button>
      </template>
    </el-dialog>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <el-button type="primary" size="large" @click="handleSubmit" :loading="submitting" class="save-btn">
        <el-icon><Check /></el-icon>保存活动
      </el-button>
      <el-button size="large" @click="handleBack">返回列表</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Picture, Upload, Check, WarningFilled, Files } from '@element-plus/icons-vue'
import { adminActivity } from '../../api'
import BlockEditor from '../../components/BlockEditor/BlockEditor.vue'
import BlockPreview from '../../components/BlockEditor/BlockPreview.vue'
import { ACTIVITY_TEMPLATES, regenerateIds } from './templates'
import type { ActivityTemplate } from './templates'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()
const coverImageError = ref(false)
const activeTab = ref<'detail' | 'scene'>('detail')
const previewActiveBlockId = ref('')

const formData = reactive<any>({
  title: '',
  subtitle: '',
  coverImage: '',
  compressedCover: '',
  headerConfig: { bgColor: '', tagColor: '', showTags: [] },
  detailBlocks: [] as any[],
  sceneBlocks: [] as any[],
  activityType: 'latest',
  headerType: 'poster',
  showDetailTab: true,
  showSceneTab: false,
  signUpEndTime: '',
  startTime: '',
  endTime: '',
  location: '',
  maxParticipants: 0,
  sortOrder: 0,
  status: 0,
})

// 模板选择器（入口 B）
const showTemplatePicker = ref(false)
const pickingTemplateKey = ref('')
const applyMode = ref<'replace' | 'append'>('replace')
const pickedTemplate = computed(() => ACTIVITY_TEMPLATES.find((t) => t.key === pickingTemplateKey.value) || null)

function getBlockPreview(b: any): string {
  switch (b.type) {
    case 'title': return b.mainTitle || '(标题)'
    case 'text': return (b.content || '').slice(0, 30) || '(文本)'
    case 'bubble': return (b.text || '').slice(0, 25) || '(气泡)'
    case 'numbered_title': return `#${b.number} ${b.title || ''}`
    case 'highlight_tag': return `#${b.text || ''}`
    case 'contact': return b.phone || '(联系信息)'
    case 'divider': return '--- 分割线 ---'
    case 'image': case 'full_image': case 'full_bleed_image': return '[图片]'
    case 'image_overlay': return b.text ? `[图文] ${b.text.slice(0, 20)}` : '[图文叠加]'
    case 'image_text_row': return b.text ? `[左图右文] ${b.text.slice(0, 20)}` : '[左图右文]'
    case 'gallery': return `[照片网格 x${(b.images || []).length}]`
    case 'scene_card': return b.innerText ? `[场景] ${b.innerText.slice(0, 20)}` : '[场景卡片]'
    case 'quote': return (b.content || '').slice(0, 25) || '(引用)'
    default: return `[${b.type}]`
  }
}

function applyPickedTemplate() {
  if (!pickedTemplate.value) return
  const template = pickedTemplate.value
  const targetBlocks = activeTab.value === 'detail'
    ? template.detailBlocks
    : template.sceneBlocks

  if (targetBlocks.length === 0) {
    ElMessage.info('该模板没有适用于当前 Tab 的积木')
    showTemplatePicker.value = false
    return
  }

  const newBlocks = regenerateIds(targetBlocks)
  if (applyMode.value === 'replace') {
    if (activeTab.value === 'detail') {
      formData.detailBlocks = newBlocks
    } else {
      formData.sceneBlocks = newBlocks
    }
  } else {
    if (activeTab.value === 'detail') {
      formData.detailBlocks = [...formData.detailBlocks, ...newBlocks]
    } else {
      formData.sceneBlocks = [...formData.sceneBlocks, ...newBlocks]
    }
  }

  ElMessage.success(`已${applyMode.value === 'replace' ? '覆盖' : '追加'}模板「${template.name}」`)
  showTemplatePicker.value = false
  pickingTemplateKey.value = ''
}

// ====== 手机实时预览 ======
const previewTitle = computed(() => activeTab.value === 'detail' ? '活动详情预览' : '活动现场预览')
const previewBlocks = computed(() => activeTab.value === 'detail' ? formData.detailBlocks : formData.sceneBlocks)

function onTabChange() {
  previewActiveBlockId.value = ''
}

function onPreviewSelectBlock(id: string) {
  previewActiveBlockId.value = id
}

// ====== 保存前质检 ======
function qualityCheckBeforeSave(): boolean {
  const checks: string[] = []

  // 检查空积木
  const emptyBlocks: string[] = []
  const allBlocks = [...formData.detailBlocks, ...formData.sceneBlocks]
  allBlocks.forEach((b: any) => {
    const name = `[${b.type}] ${(getBlockPreview(b)).slice(0, 20)}`
    if ((['image', 'full_image', 'full_bleed_image', 'image_overlay'].includes(b.type)) && !b.url && !b.imageUrl) {
      emptyBlocks.push(name + ' — 无图片')
    } else if (b.type === 'gallery' && (!b.images || b.images.length === 0)) {
      emptyBlocks.push(name + ' — 无图片')
    } else if (b.type === 'scene_card' && !b.bgImage && (!b.innerImages || b.innerImages.length === 0)) {
      emptyBlocks.push(name + ' — 无图片')
    } else if (b.type === 'contact' && !b.phone && !b.qrCode) {
      emptyBlocks.push(name + ' — 电话和二维码均为空')
    } else if (((b.type === 'text' || b.type === 'quote') && !b.content) || (b.type === 'bubble' && !b.text) || (b.type === 'title' && !b.mainTitle)) {
      emptyBlocks.push(name + ' — 文字为空')
    }
  })

  if (emptyBlocks.length > 0) {
    checks.push('以下积木内容为空：\n' + emptyBlocks.join('\n'))
  }

  if (formData.showSceneTab && (!formData.sceneBlocks || formData.sceneBlocks.length === 0)) {
    checks.push('已开启「活动现场」Tab，但未添加任何积木，C 端将显示「暂无内容」')
  }

  if (checks.length > 0) {
    ElMessage.warning('内容不完整，请检查')
    return false
  }
  return true
}

function getBlockComposition(tmpl: ActivityTemplate): string {
  const all = [...(tmpl.detailBlocks || []), ...(tmpl.sceneBlocks || [])]
  if (all.length === 0) return '空白模板'
  const counts: Record<string, number> = {}
  all.forEach((b: any) => { counts[b.type] = (counts[b.type] || 0) + 1 })
  const labels: Record<string, string> = {
    title: '标题', text: '文本', numbered_title: '编号章节', highlight_tag: '标签',
    bubble: '气泡', gallery: '图集', image: '图片', full_image: '全宽图',
    full_bleed_image: '出血图', image_overlay: '图文叠加', image_text_row: '左图右文',
    scene_card: '场景卡片', quote: '引用', contact: '联系信息', divider: '分割线',
  }
  const parts = Object.entries(counts).map(([k, v]) => `${labels[k] || k}×${v}`)
  return parts.join(' · ')
}

const formRules: FormRules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  coverImage: [{ required: true, message: '请上传活动海报', trigger: 'change' }],
  activityType: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    {
      validator: (rule, value, callback) => {
        if (value && formData.startTime && new Date(value) <= new Date(formData.startTime)) {
          callback(new Error('结束时间必须晚于开始时间'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
  signUpEndTime: [
    {
      validator: (rule, value, callback) => {
        if (value && formData.startTime && new Date(value) >= new Date(formData.startTime)) {
          callback(new Error('报名截止时间必须早于开始时间'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

onMounted(() => {
  if (isEdit.value) {
    fetchData()
  } else {
    // 新建活动：检查是否通过模板入口进入
    const templateKey = route.query.template as string
    if (templateKey) {
      applyQueryTemplate(templateKey)
    }
  }
})

function applyQueryTemplate(templateKey: string) {
  const template = ACTIVITY_TEMPLATES.find((t) => t.key === templateKey)
  if (!template) return

  const preset = template.preset
  // 仅预填未被用户修改过的空值字段
  if (preset.activityType && !formData.activityType) formData.activityType = preset.activityType
  if (preset.headerType) formData.headerType = preset.headerType
  if (preset.showDetailTab !== undefined) formData.showDetailTab = preset.showDetailTab
  if (preset.showSceneTab !== undefined) formData.showSceneTab = preset.showSceneTab
  if (preset.maxParticipants !== undefined) formData.maxParticipants = preset.maxParticipants

  // 注入模板积木
  if (template.detailBlocks.length > 0) {
    formData.detailBlocks = regenerateIds(template.detailBlocks)
  }
  if (template.sceneBlocks.length > 0) {
    formData.sceneBlocks = regenerateIds(template.sceneBlocks)
  }
}

async function fetchData() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const res = await adminActivity.detail(id)
    if (res.success && res.data) {
      coverImageError.value = false
      Object.assign(formData, {
        ...res.data,
        detailBlocks: res.data.detailBlocks || [],
        sceneBlocks: res.data.sceneBlocks || [],
        // 旧活动可能无以下字段，保留初始默认值
        compressedCover: res.data.compressedCover || '',
        headerConfig: res.data.headerConfig || { bgColor: '', tagColor: '', showTags: [] },
        showDetailTab: res.data.showDetailTab != null ? res.data.showDetailTab : true,
        showSceneTab: res.data.showSceneTab != null ? res.data.showSceneTab : false,
      })
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取活动信息失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.back()
}

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (!formData.coverImage) {
    ElMessage.error('请上传活动海报')
    return
  }

  // 保存前质检
  qualityCheckBeforeSave()

  submitting.value = true
  try {
    const { detailBlocks, sceneBlocks, ...rest } = formData as any
    const submitData = {
      ...rest,
      detailBlocks: detailBlocks || [],
      sceneBlocks: sceneBlocks || [],
    }
    let res
    if (isEdit.value) {
      res = await adminActivity.update(Number(route.params.id), submitData)
    } else {
      res = await adminActivity.create(submitData)
    }
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      router.push('/activity/list')
    } else {
      ElMessage.error(res.message || (isEdit.value ? '更新失败' : '添加失败'))
    }
  } catch (error: any) {
    console.error(error)
    ElMessage.error(error.message || (isEdit.value ? '更新失败' : '添加失败'))
  } finally {
    submitting.value = false
  }
}

function triggerUpload() {
  fileInputRef.value?.click()
}

function handleCoverImageError() {
  if (!coverImageError.value) {
    coverImageError.value = true
    ElMessage.warning('海报加载失败，请重新上传')
  }
}

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    ElMessage.info('正在上传海报...')
    await uploadFile(file)
    coverImageError.value = false
    ElMessage.success('海报上传成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('海报上传失败')
  } finally {
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

async function uploadFile(file: File): Promise<string> {
  const formDataObj = new FormData()
  formDataObj.append('file', file)

  const res = await adminActivity.upload(formDataObj)
  if (res.success && res.data?.url) {
    formData.coverImage = res.data.url
    formData.compressedCover = res.data.compressedUrl || res.data.url
    return res.data.url
  }
  throw new Error('上传失败')
}
</script>

<style lang="scss" scoped>
.activity-edit {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  .page-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
  }
}

.form-card {
  margin-bottom: 20px;

  .card-header {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
  }
}

.editor-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 16px;
    font-weight: bold;
    color: #303133;

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-tip {
      font-size: 13px;
      font-weight: normal;
      color: #909399;
    }
  }

  .editor-split {
    display: flex;
    gap: 20px;

    .editor-left {
      flex: 1;
      min-width: 0;
    }

    .editor-right {
      flex-shrink: 0;
      width: 375px;
    }
  }
}

.activity-form {
  :deep(.el-form-item__label) {
    font-weight: 500;
  }
}

.upload-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 20px;

  .cover-preview {
    width: 300px;
    height: 160px;
    border-radius: 8px;
    border: 1px solid #dcdfe6;
  }

  .cover-placeholder {
    width: 300px;
    height: 160px;
    border-radius: 8px;
    border: 2px dashed #dcdfe6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #909399;
    background-color: #f5f7fa;
  }

  .upload-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .upload-tip {
      font-size: 12px;
      color: #909399;
      margin: 0;
    }
  }
}

.form-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

.block-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }
}

.tab-label-muted {
  color: #c0c4cc;
}

.tab-hint-icon {
  margin-left: 4px;
  color: #e6a23c;
  font-size: 14px;
  vertical-align: middle;
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

  .save-btn {
    background-color: #409EFF;
    border-color: #409EFF;
    padding: 0 40px;

    &:hover {
      background-color: #66B1FF;
      border-color: #66B1FF;
    }
  }
}

/* 模板选择器（入口 B） */
.template-picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;

  .template-picker-card {
    border: 2px solid #e4e7ed;
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    text-align: center;

    &:hover {
      border-color: #409EFF;
      background-color: #ecf5ff;
    }

    &.selected {
      border-color: #409EFF;
      background-color: #ecf5ff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }

    .tpc-emoji { font-size: 36px; margin-bottom: 8px; }
    .tpc-name { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 4px; }
    .tpc-desc { font-size: 12px; color: #909399; line-height: 1.4; }
    .tpc-composition { margin-top: 6px; font-size: 11px; color: #c0c4cc; }
    .tpc-tag { position: absolute; top: 8px; right: 8px; }
  }
}

.template-preview {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;

  .tp-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 10px;
  }

  .tp-blocks {
    .tp-block-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 0;
      font-size: 13px;

      .tp-block-text {
        color: #606266;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .tp-empty {
      font-size: 13px;
      color: #c0c4cc;
    }
  }
}

.template-apply-mode {
  padding: 12px 0;
  border-top: 1px solid #ebeef5;
}
</style>
