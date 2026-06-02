<template>
  <div class="profile-page">
    <div class="page-header">
      <h2 class="page-title">个人中心</h2>
    </div>

    <el-row :gutter="20">
      <!-- 左侧：头像和基本信息 -->
      <el-col :span="8">
        <el-card class="profile-card">
          <template #header>
            <span>头像设置</span>
          </template>
          <div class="avatar-section">
            <el-avatar
              :size="120"
              :src="formData.avatar"
              class="profile-avatar"
              @error="() => ElMessage.error('头像加载失败')"
            />
            <el-button type="primary" @click="triggerAvatarUpload" class="upload-btn">
              <el-icon><Upload /></el-icon>更换头像
            </el-button>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleAvatarChange"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：个人信息表单 -->
      <el-col :span="16">
        <el-card class="profile-card">
          <template #header>
            <span>基本信息</span>
          </template>
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="100px"
            class="profile-form"
          >
            <el-form-item label="昵称" prop="nickname">
              <el-input
                v-model="formData.nickname"
                placeholder="请输入昵称"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="用户名" prop="username">
              <el-input v-model="formData.username" disabled />
            </el-form-item>

            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="formData.newPassword"
                type="password"
                placeholder="不修改请留空"
                show-password
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="formData.confirmPassword"
                type="password"
                placeholder="再次输入新密码"
                show-password
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSubmit" :loading="submitting">
                <el-icon><Check /></el-icon>保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Check } from '@element-plus/icons-vue'
import { useAdminStore } from '../../store/admin'
import { adminSystem } from '../../api'
import type { FormInstance, FormRules } from 'element-plus'

const adminStore = useAdminStore()
const formRef = ref<FormInstance>()
const avatarInputRef = ref<HTMLInputElement>()
const submitting = ref(false)

const formData = reactive({
  nickname: '',
  username: '',
  avatar: '',
  newPassword: '',
  confirmPassword: '',
})

const formRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (formData.newPassword && value !== formData.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

onMounted(() => {
  // 加载当前用户信息
  const userInfo = adminStore.userInfo
  if (userInfo) {
    formData.nickname = userInfo.nickname || ''
    formData.username = userInfo.username || ''
    formData.avatar = userInfo.avatar || ''
  }
})

function triggerAvatarUpload() {
  avatarInputRef.value?.click()
}

async function handleAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    ElMessage.info('正在上传头像...')
    const url = await uploadFile(file)
    formData.avatar = url + '?t=' + Date.now()
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

async function uploadFile(file: File): Promise<string> {
  const formDataObj = new FormData()
  formDataObj.append('file', file)

  const res = await adminSystem.upload(formDataObj)
  if (res.success && res.data?.url) {
    return res.data.url
  }
  throw new Error('上传失败')
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
    // 更新用户信息
    const updateData: any = {
      nickname: formData.nickname,
      avatar: formData.avatar,
    }

    if (formData.newPassword) {
      updateData.password = formData.newPassword
    }

    // 调用API更新用户信息
    const res = await adminSystem.updateProfile(updateData)

    if (res.success) {
      // 更新本地存储的用户信息
      adminStore.updateUserInfo({
        nickname: formData.nickname,
        avatar: formData.avatar,
      })
      ElMessage.success('保存成功')
      // 清空密码字段
      formData.newPassword = ''
      formData.confirmPassword = ''
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error: any) {
    console.error(error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  .page-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
  }
}

.profile-card {
  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;

    .profile-avatar {
      margin-bottom: 20px;
      border: 2px solid #e0e0e0;
    }

    .upload-btn {
      width: 100%;
    }
  }
}

.profile-form {
  max-width: 500px;
  padding: 20px;
}
</style>
