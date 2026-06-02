<template>
  <div class="matchmaker-edit">
    <div class="page-header">
      <el-button @click="handleBack" :icon="ArrowLeft">返回</el-button>
      <h2 class="page-title">{{ isEdit ? '编辑红娘' : '添加红娘' }}</h2>
    </div>

    <div class="card">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="matchmaker-form"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入红娘姓名" style="width: 300px" />
        </el-form-item>

        <el-form-item label="头衔" prop="title">
          <el-input v-model="formData.title" placeholder="如：专业红娘顾问" style="width: 300px" />
        </el-form-item>

        <el-form-item label="微信号" prop="wechat">
          <el-input v-model="formData.wechat" placeholder="请输入微信号" style="width: 300px" />
        </el-form-item>

        <el-form-item label="电话" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入联系电话" style="width: 300px" />
        </el-form-item>

        <el-form-item label="头像" prop="avatar">
          <div class="upload-wrapper">
            <Avatar :src="formData.avatar" type="matchmaker" :size="100" :key="avatarKey" />
            <div class="upload-actions">
              <el-button type="primary" size="small" @click="triggerUpload('avatar')">
                上传头像
              </el-button>
              <p class="upload-tip">支持 JPG、PNG 格式，建议尺寸 200x200</p>
            </div>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleAvatarChange"
            />
          </div>
        </el-form-item>

        <el-form-item label="二维码" prop="qrcode">
          <div class="upload-wrapper">
            <el-image
              v-if="formData.qrcode && !qrcodeError"
              :src="formData.qrcode"
              fit="contain"
              class="qrcode-preview"
              @error="handleQrcodeError"
            />
            <div v-else class="qrcode-placeholder">
              <el-icon :size="40"><Picture /></el-icon>
              <span>暂无二维码</span>
            </div>
            <div class="upload-actions">
              <el-button type="primary" size="small" @click="triggerUpload('qrcode')">
                上传二维码
              </el-button>
              <p class="upload-tip">支持 JPG、PNG 格式</p>
            </div>
            <input
              ref="qrcodeInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleQrcodeChange"
            />
          </div>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="4"
            placeholder="请输入红娘描述（最多200字）"
            maxlength="200"
            show-word-limit
            style="width: 500px"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="formData.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>

        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
          <span class="sort-tip">数字越小越靠前</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            保存
          </el-button>
          <el-button @click="handleBack">返回</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Picture } from '@element-plus/icons-vue'
import { adminMatchmaker } from '../../api'
import Avatar from '../../components/Avatar.vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { Matchmaker } from '../../api/matchmaker'

interface MatchmakerFormData {
  name: string
  title: string
  wechat: string
  phone: string
  avatar: string
  qrcode: string
  description: string
  status: number
  sortOrder: number
}

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const avatarInputRef = ref<HTMLInputElement>()
const qrcodeInputRef = ref<HTMLInputElement>()
const qrcodeError = ref(false)
const avatarKey = ref(0)

const isEdit = computed(() => !!route.params.id)

const defaultFormData: MatchmakerFormData = {
  name: '',
  title: '',
  wechat: '',
  phone: '',
  avatar: '',
  qrcode: '',
  description: '',
  status: 1,
  sortOrder: 0,
}

const formData = reactive<MatchmakerFormData>({ ...defaultFormData })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入红娘姓名', trigger: 'blur' }],
  wechat: [{ required: true, message: '请输入微信号', trigger: 'blur' }],
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
    const res = await adminMatchmaker.detail(id)
    if (res.success && res.data) {
      avatarKey.value++
      qrcodeError.value = false
      Object.assign(formData, res.data)
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取红娘信息失败')
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

  submitting.value = true
  try {
    let res
    if (isEdit.value) {
      res = await adminMatchmaker.update(Number(route.params.id), formData)
    } else {
      res = await adminMatchmaker.create(formData)
    }
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      router.push('/matchmaker/list')
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

function triggerUpload(type: 'avatar' | 'qrcode') {
  if (type === 'avatar') {
    avatarInputRef.value?.click()
  } else {
    qrcodeInputRef.value?.click()
  }
}

function handleQrcodeError() {
  if (!qrcodeError.value) {
    qrcodeError.value = true
    ElMessage.warning('二维码加载失败，请重新上传')
  }
}

async function handleAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const url = await uploadFile(file)
    formData.avatar = url
    avatarKey.value++
    ElMessage.success('头像上传成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('头像上传失败')
  } finally {
    if (avatarInputRef.value) {
      avatarInputRef.value.value = ''
    }
  }
}

async function handleQrcodeChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const url = await uploadFile(file)
    formData.qrcode = url
    qrcodeError.value = false
    ElMessage.success('二维码上传成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('二维码上传失败')
  } finally {
    if (qrcodeInputRef.value) {
      qrcodeInputRef.value.value = ''
    }
  }
}

async function uploadFile(file: File): Promise<string> {
  const formDataObj = new FormData()
  formDataObj.append('file', file)

  const res = await adminMatchmaker.upload(formDataObj)
  if (res.success && res.data?.url) {
    return res.data.url
  }
  throw new Error('上传失败')
}
</script>

<style lang="scss" scoped>
.matchmaker-edit {
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

.matchmaker-form {
  max-width: 600px;
}

.upload-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 20px;

  .qrcode-preview {
    width: 100px;
    height: 100px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }

  .qrcode-placeholder {
    width: 100px;
    height: 100px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #909399;
    font-size: 12px;
    gap: 4px;
  }

  .upload-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .upload-tip {
    color: #909399;
    font-size: 12px;
    margin: 0;
  }
}

.sort-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
</style>
