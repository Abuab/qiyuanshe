<template>
  <div class="activity-edit">
    <div class="page-header">
      <el-button @click="handleBack" :icon="ArrowLeft">返回</el-button>
      <h2 class="page-title">{{ isEdit ? '编辑活动' : '添加活动' }}</h2>
    </div>

    <div class="card">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        class="activity-form"
      >
        <el-form-item label="活动标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入活动标题"
            maxlength="200"
            show-word-limit
            style="width: 500px"
          />
        </el-form-item>

        <el-form-item label="副标题" prop="subtitle">
          <el-input
            v-model="formData.subtitle"
            placeholder="请输入副标题/简介"
            maxlength="500"
            show-word-limit
            style="width: 500px"
          />
        </el-form-item>

        <el-form-item label="顶部海报" prop="coverImage">
          <div class="upload-wrapper">
            <el-image
              v-if="formData.coverImage"
              :src="formData.coverImage"
              fit="cover"
              class="cover-preview"
            />
            <div v-else class="cover-placeholder">
              <el-icon :size="40"><Picture /></el-icon>
              <span>暂无海报</span>
            </div>
            <div class="upload-actions">
              <el-button type="primary" size="small" @click="triggerUpload">
                上传海报
              </el-button>
              <p class="upload-tip">建议宽度750px，支持 JPG、PNG 格式</p>
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

        <el-form-item label="活动类型" prop="activityType">
          <el-radio-group v-model="formData.activityType">
            <el-radio label="latest">最新活动</el-radio>
            <el-radio label="online">线上互选</el-radio>
            <el-radio label="cp">一周CP</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="报名截止" prop="signUpEndTime">
          <el-date-picker
            v-model="formData.signUpEndTime"
            type="datetime"
            placeholder="选择报名截止时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <el-form-item label="开始时间" prop="startTime">
          <el-date-picker
            v-model="formData.startTime"
            type="datetime"
            placeholder="选择活动开始时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <el-form-item label="结束时间" prop="endTime">
          <el-date-picker
            v-model="formData.endTime"
            type="datetime"
            placeholder="选择活动结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <el-form-item label="活动地点" prop="location">
          <el-input
            v-model="formData.location"
            placeholder="请输入活动地点"
            style="width: 300px"
          />
        </el-form-item>

        <el-form-item label="人数上限" prop="maxParticipants">
          <el-input-number v-model="formData.maxParticipants" :min="0" :max="9999" />
          <span class="form-tip">0 表示不限人数</span>
        </el-form-item>

        <el-form-item label="活动详情" prop="content">
          <div class="editor-wrapper">
            <Toolbar
              :editor="editorRef"
              :defaultConfig="toolbarConfig"
              mode="default"
              class="editor-toolbar"
            />
            <Editor
              v-model="formData.content"
              :defaultConfig="editorConfig"
              mode="default"
              class="editor-content"
              @onCreated="handleCreated"
            />
          </div>
        </el-form-item>

        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
          <span class="form-tip">数字越小越靠前</span>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :label="0">草稿</el-radio>
            <el-radio :label="1">进行中</el-radio>
            <el-radio :label="2">已结束</el-radio>
            <el-radio :label="3">已取消</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting" class="save-btn">
            保存
          </el-button>
          <el-button @click="handleBack">返回</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed, shallowRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Picture } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { adminActivity } from '../../api'
import type { FormInstance, FormRules } from 'element-plus'
import '@wangeditor/editor/dist/css/style.css'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()

// 编辑器相关
const editorRef = shallowRef<IDomEditor>()

const toolbarConfig: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'headerSelect',
    '|',
    'bold',
    'italic',
    'underline',
    'through',
    'color',
    'bgColor',
    '|',
    'fontSize',
    'fontFamily',
    'lineHeight',
    '|',
    'bulletedList',
    'numberedList',
    'todo',
    'justifyLeft',
    'justifyCenter',
    'justifyRight',
    '|',
    'insertLink',
    'uploadImage',
    'insertVideo',
    'insertTable',
    'divider',
    '|',
    'undo',
    'redo',
    'clearStyle',
  ],
}

const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入活动详情，支持图文混排...',
  MENU_CONF: {
    uploadImage: {
      async customUpload(file: File, insertFn: any) {
        try {
          const url = await uploadFile(file)
          insertFn(url, file.name, url)
          ElMessage.success('图片插入成功')
        } catch (error) {
          console.error(error)
          ElMessage.error('图片上传失败')
        }
      },
    },
  },
}

const handleCreated = (editor: IDomEditor) => {
  editorRef.value = editor
}

const formData = reactive({
  title: '',
  subtitle: '',
  coverImage: '',
  content: '',
  activityType: 'latest',
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

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) {
    editor.destroy()
  }
})

async function fetchData() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const res = await adminActivity.detail(id)
    if (res.success && res.data) {
      Object.assign(formData, res.data)
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
    const submitData = { ...formData }
    let res
    if (isEdit.value) {
      res = await adminActivity.update(Number(route.params.id), submitData)
    } else {
      res = await adminActivity.create(submitData)
    }
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      router.push('/activity/list')
    } else {
      ElMessage.error(res.message || (isEdit.value ? '更新失败' : '创建失败'))
    }
  } catch (error: any) {
    console.error(error)
    ElMessage.error(error.message || (isEdit.value ? '更新失败' : '创建失败'))
  } finally {
    submitting.value = false
  }
}

function triggerUpload() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const url = await uploadFile(file)
    formData.coverImage = url + '?t=' + Date.now()
    ElMessage.success('海报上传成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('海报上传失败')
  }
}

async function uploadFile(file: File): Promise<string> {
  const formDataObj = new FormData()
  formDataObj.append('file', file)

  const res = await adminActivity.upload(formDataObj)
  if (res.success && res.data?.url) {
    return res.data.url
  }
  throw new Error('上传失败')
}
</script>

<style lang="scss" scoped>
.activity-edit {
  padding: 20px;
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

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
}

.activity-form {
  max-width: 900px;
}

.upload-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.cover-preview {
  width: 200px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
}

.cover-placeholder {
  width: 200px;
  height: 120px;
  border-radius: 8px;
  border: 1px dashed #dcdfe6;
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
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.form-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 13px;
}

// 编辑器样式
.editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;

  .editor-toolbar {
    border-bottom: 1px solid #dcdfe6;
  }

  .editor-content {
    min-height: 400px;
    max-height: 600px;
  }
}

.save-btn {
  background-color: #FF6B9D;
  border-color: #FF6B9D;

  &:hover {
    background-color: #ff5a8f;
    border-color: #ff5a8f;
  }
}
</style>
