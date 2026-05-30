<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">栖缘社管理后台</h1>
        <p class="login-subtitle">Welcome to Qiyuanshe Admin</p>
      </div>

      <el-form
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
            <img
              :src="captchaUrl"
              class="captcha-image"
              @click="refreshCaptcha"
              alt="验证码"
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
      </el-form>

      <div class="login-footer">
        <p>默认账号: admin / 123456</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAdminStore } from '../store/admin'
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
const captchaUrl = ref('')

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

function refreshCaptcha() {
  captchaUrl.value = `/api/admin/captcha?t=${Date.now()}`
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
    await adminStore.login(form.username, form.password, form.captcha, form.rememberMe)
  } catch (error) {
    ElMessage.error('登录失败，请检查账号密码')
  } finally {
    loading.value = false
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
  width: 400px;
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

.login-footer {
  text-align: center;
  margin-top: 24px;

  p {
    font-size: 12px;
    color: #999;
    margin: 0;
  }
}
</style>
