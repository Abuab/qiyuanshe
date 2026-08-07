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
                placeholder="请输入副标题/简介"
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
              <span class="form-tip">0 表示不限人数</span>
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

    <!-- 积木编辑器区域：双 Tab -->
    <el-card class="editor-card">
      <template #header>
        <div class="card-header">
          <span>活动详情</span>
          <span class="header-tip">使用积木组件自由排版活动内容</span>
        </div>
      </template>
      <el-tabs v-model="activeTab" class="block-tabs">
        <el-tab-pane label="活动详情" name="detail">
          <BlockEditor v-model="formData.detailBlocks" />
        </el-tab-pane>
        <el-tab-pane label="活动现场" name="scene">
          <BlockEditor v-model="formData.sceneBlocks" :showTemplate="true" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

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
import { ArrowLeft, Picture, Upload, Check } from '@element-plus/icons-vue'
import { adminActivity } from '../../api'
import BlockEditor from '../../components/BlockEditor/BlockEditor.vue'
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
  signUpEndTime: '',
  startTime: '',
  endTime: '',
  location: '',
  maxParticipants: 0,
  sortOrder: 0,
  status: 0,
})

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
  }
})

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

    .header-tip {
      font-size: 13px;
      font-weight: normal;
      color: #909399;
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
</style>
