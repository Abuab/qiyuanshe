<template>
  <div class="agreement-edit">
    <div class="page-header">
      <h2 class="page-title">协议管理</h2>
    </div>

    <div class="card">
      <!-- 类型切换 -->
      <el-radio-group v-model="currentType" class="type-switch" @change="handleTypeChange">
        <el-radio-button value="USER_AGREEMENT">用户协议</el-radio-button>
        <el-radio-button value="PRIVACY_POLICY">隐私政策</el-radio-button>
      </el-radio-group>

      <el-form :model="formData" label-width="80px" class="edit-form">
        <el-form-item label="协议标题">
          <el-input v-model="formData.title" placeholder="请输入协议标题" maxlength="200" />
        </el-form-item>

        <el-form-item label="协议内容">
          <div style="border: 1px solid #ccc">
            <Toolbar
              style="border-bottom: 1px solid #ccc"
              :editor="editorRef"
              :default-config="toolbarConfig"
            />
            <Editor
              style="height: 500px; overflow-y: hidden"
              v-model="formData.content"
              :default-config="editorConfig"
              @onCreated="handleCreated"
            />
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存协议</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 预览区 -->
      <el-divider />
      <div class="preview-section">
        <h3>预览效果</h3>
        <div class="preview-card">
          <div class="preview-header">
            <h4>{{ formData.title || '协议标题' }}</h4>
          </div>
          <div class="preview-content" v-html="formData.content"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { adminAgreement } from '../../api/agreement'

const currentType = ref<'USER_AGREEMENT' | 'PRIVACY_POLICY'>('USER_AGREEMENT')
const saving = ref(false)
const editorRef = shallowRef<IDomEditor>()

const formData = ref({
  title: '',
  content: '',
})

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: [
    'group-image',
    'group-video',
    'fullScreen',
  ],
}

const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入协议内容...',
}

const handleCreated = (editor: IDomEditor) => {
  editorRef.value = editor
}

onMounted(async () => {
  await loadAgreement()
})

async function loadAgreement() {
  try {
    const res = await adminAgreement.list()
    if (res.success && res.data) {
      const list = res.data
      const current = list.find((a) => a.type === currentType.value && a.isActive === 1)
      if (current) {
        formData.value.title = current.title
        formData.value.content = current.content
      } else {
        // 默认兜底
        formData.value.title = currentType.value === 'USER_AGREEMENT' ? '用户协议' : '隐私政策'
        formData.value.content = ''
      }
    }
  } catch (e: any) {
    console.error('加载协议失败:', e)
    ElMessage.warning('加载协议失败，将使用默认内容')
  }
}

async function handleTypeChange() {
  await loadAgreement()
}

async function handleSave() {
  if (!formData.value.title.trim()) {
    ElMessage.warning('请输入协议标题')
    return
  }
  if (!formData.value.content.trim()) {
    ElMessage.warning('请输入协议内容')
    return
  }

  saving.value = true
  try {
    await adminAgreement.save({
      type: currentType.value,
      title: formData.value.title.trim(),
      content: formData.value.content,
    })
    ElMessage.success('保存成功')
  } catch (e: any) {
    console.error('保存失败:', e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function handleReset() {
  loadAgreement()
}
</script>

<style scoped>
.agreement-edit {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.type-switch {
  margin-bottom: 24px;
}

.edit-form {
  max-width: 900px;
}

.preview-section h3 {
  font-size: 16px;
  color: #606266;
  margin-bottom: 16px;
}

.preview-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  max-width: 720px;
}

.preview-header {
  background: linear-gradient(135deg, #FFF5F7, #FFE4ED);
  padding: 20px;
  text-align: center;
}

.preview-header h4 {
  font-size: 18px;
  color: #FF6B9D;
  margin: 0;
}

.preview-content {
  padding: 24px;
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;
}
</style>
