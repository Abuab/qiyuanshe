<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">栖缘社管理后台</h1>
        <p class="login-subtitle">Welcome to Qiyuanshe Admin</p>
      </div>

      <el-form
        v-if="!needMfa"
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
          >
            <template #suffix>
              <el-icon @click="showPassword = !showPassword" class="password-toggle">
                <Hide v-if="showPassword" />
                <View v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="captcha">
          <div class="captcha-wrapper">
            <el-input
              v-model="form.captcha"
              placeholder="请输入验证码"
              size="large"
              :prefix-icon="CircleCheck"
              class="captcha-input"
              @keyup.enter="handleLogin"
            />
            <div
              class="captcha-image"
              @click="refreshCaptcha"
              v-html="captchaSvg"
            />
          </div>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-button"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>

        <div class="login-options">
          <el-button link @click="showResetDialog = true">忘记密码？</el-button>
        </div>
      </el-form>

      <div v-else class="mfa-step">
        <h3 class="mfa-title">双因素认证</h3>
        <p class="mfa-desc">请打开验证器应用（Microsoft / Google Authenticator）查看 6 位验证码</p>
        <el-form @submit.prevent="handleMfaSubmit">
          <el-form-item>
            <el-input
              v-model="mfaCode"
              maxlength="6"
              placeholder="6位验证码"
              size="large"
              @keyup.enter="handleMfaSubmit"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="mfaLoading"
              class="login-button"
              @click="handleMfaSubmit"
            >
              {{ mfaLoading ? '验证中...' : '验证并登录' }}
            </el-button>
          </el-form-item>
          <el-form-item>
            <el-button link class="back-button" @click="handleBackToLogin">
              返回登录
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <el-dialog v-model="showResetDialog" title="重置密码" width="420px">
      <el-form :model="resetForm" label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="resetForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="resetForm.newPassword" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="重置密钥">
          <el-input v-model="resetForm.adminKey" type="password" placeholder="请联系运维获取" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetDialog = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword" :loading="resetLoading">确认重置</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAdminStore } from '../store/admin'
import { adminSystem } from '../api'
import { User, Lock, CircleCheck, View, Hide } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

interface LoginForm {
  username: string
  password: string
  captcha: string
  rememberMe: boolean
}

const adminStore = useAdminStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const showPassword = ref(false)
const captchaSvg = ref('')
const captchaKey = ref('')

const needMfa = ref(false)
const mfaType = ref('')
const tempToken = ref('')
const mfaCode = ref('')
const mfaLoading = ref(false)

const showResetDialog = ref(false)
const resetLoading = ref(false)
const resetForm = reactive({
  username: 'admin',
  newPassword: '',
  adminKey: '',
})

const form = reactive<LoginForm>({
  username: '',
  password: '',
  captcha: '',
  rememberMe: false,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为6-20个字符', trigger: 'blur' },
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码为4个字符', trigger: 'blur' },
  ],
}

onMounted(() => {
  refreshCaptcha()

  const rememberMe = localStorage.getItem('admin_remember')
  if (rememberMe === 'true') {
    form.rememberMe = true
  }
})

async function refreshCaptcha() {
  try {
    const response = await fetch('/api/admin/captcha')
    const result = await response.json()
    const data = result.data || result
    captchaSvg.value = data.svg
    captchaKey.value = data.key
  } catch (error) {
    console.error('Failed to fetch captcha:', error)
  }
}

async function handleLogin() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true

  try {
    const result = await adminStore.login(form.username, form.password, form.captcha, form.rememberMe, captchaKey.value)
    if (result.needMfa) {
      needMfa.value = true
      mfaType.value = result.mfaType || ''
      tempToken.value = result.tempToken || ''
    }
  } catch (error: any) {
    ElMessage.error(error.message || '网络错误，请稍后重试')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

function handleBackToLogin() {
  needMfa.value = false
  mfaCode.value = ''
}

async function handleMfaSubmit() {
  if (!mfaCode.value) {
    ElMessage.warning('请输入验证码')
    return
  }

  mfaLoading.value = true
  try {
    await adminStore.mfaLoginVerify(tempToken.value, mfaCode.value)
  } catch (error: any) {
    ElMessage.error(error.message || '验证失败')
  } finally {
    mfaLoading.value = false
  }
}

async function handleResetPassword() {
  if (!resetForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (resetForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少6位')
    return
  }
  if (!resetForm.adminKey) {
    ElMessage.warning('请输入重置密钥')
    return
  }

  resetLoading.value = true
  try {
    const res = await adminSystem.resetPassword(resetForm)
    if (res.success) {
      ElMessage.success('密码已重置，请用新密码登录')
      showResetDialog.value = false
      resetForm.newPassword = ''
      resetForm.adminKey = ''
    } else {
      ElMessage.error(res.message || '重置失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败')
  } finally {
    resetLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FF6B9D 0%, #FF8FAB 100%);
}

.login-card {
  width: 420px;
  background-color: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-title {
  font-size: 28px;
  font-weight: bold;
  color: #FF6B9D;
  margin: 0 0 8px 0;
  letter-spacing: 2px;
}

.login-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 24px;
  }

  :deep(.el-input__wrapper) {
    padding: 4px 16px;
  }
}

.password-toggle {
  cursor: pointer;
  color: #999;
  transition: color 0.3s;

  &:hover {
    color: #FF6B9D;
  }
}

.captcha-wrapper {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-input {
  flex: 1;
}

.captcha-image {
  width: 120px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border: none;
  border-radius: 8px;

  &:hover {
    background: linear-gradient(135deg, #FF5B8D, #FF7B9D);
  }
}

.back-button {
  width: 100%;
  color: #999;
}

.login-options {
  text-align: right;
  margin-top: -10px;
  margin-bottom: 10px;
}

.mfa-step {
  text-align: center;

  .mfa-title {
    font-size: 20px;
    font-weight: bold;
    color: #333;
    margin-bottom: 12px;
  }

  .mfa-desc {
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }
}
</style>
