<template>
  <div class="login-page">
    <!-- ===== 左侧品牌区 ===== -->
    <div class="brand-panel">
      <!-- 浮动模糊光球 -->
      <div class="floating-orb orb-1" />
      <div class="floating-orb orb-2" />
      <div class="floating-orb orb-3" />
      <!-- 网格装饰伪元素通过 CSS 实现 -->
      <div class="brand-content">
        <h1 class="brand-title">{{ appName }}</h1>
        <div class="brand-divider" />
        <p class="brand-subtitle">智能婚恋管理平台</p>
      </div>
      <p class="brand-copyright">&copy; 2026 {{ appName }} All Rights Reserved</p>
    </div>

    <!-- ===== 右侧表单区 ===== -->
    <div class="form-panel">
      <div class="login-card">
        <!-- 登录表单 -->
        <template v-if="!needMfa">
          <div class="card-header">
            <h2 class="card-title">{{ appName }}管理后台</h2>
            <p class="card-subtitle">Welcome back, please login to your account</p>
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
                <!-- 移除 @keyup.enter：el-form @submit.prevent 已统一处理 Enter 提交，避免重复触发 -->
                <el-input
                  v-model="form.captcha"
                  placeholder="请输入验证码"
                  size="large"
                  :prefix-icon="CircleCheck"
                  class="captcha-input"
                />
                <div
                  class="captcha-image"
                  @click="refreshCaptcha"
                  v-html="captchaSvg"
                />
              </div>
            </el-form-item>

            <div class="form-options">
              <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
              <el-button link class="forgot-password" @click="showResetDialog = true">忘记密码？</el-button>
            </div>

            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-button"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form>
        </template>

        <!-- MFA 步骤 -->
        <template v-else>
          <div class="card-header">
            <h2 class="card-title mfa-title">双因素认证</h2>
            <p class="card-subtitle mfa-desc">请打开验证器应用（Microsoft / Google Authenticator）查看 6 位验证码</p>
          </div>
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
            <el-button
              type="primary"
              size="large"
              :loading="mfaLoading"
              class="login-button"
              @click="handleMfaSubmit"
            >
              {{ mfaLoading ? '验证中...' : '验证并登录' }}
            </el-button>
            <div class="mfa-back">
              <el-button link class="back-button" @click="handleBackToLogin">
                返回登录
              </el-button>
            </div>
          </el-form>
        </template>
      </div>
    </div>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="showResetDialog" title="重置密码" width="420px" class="reset-dialog">
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
        <el-button type="primary" class="reset-confirm-btn" @click="handleResetPassword" :loading="resetLoading">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useAdminStore } from '../store/admin'
import { useSystemStore } from '../store/system'
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
const systemStore = useSystemStore()
const appName = computed(() => systemStore.appName)
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
  systemStore.fetchSystemConfig()
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
  // 兜底防重：loading 为 true 时跳过（配合移除 captcha input 的 @keyup.enter，根治 Enter 键双重触发）
  if (!formRef.value || loading.value) return

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
/* ============================================
   整体布局 - 左右分栏
   ============================================ */
.login-page {
  min-height: 100vh;
  display: flex;
  overflow: hidden;
}

/* ===== 左侧品牌区 ===== */
.brand-panel {
  position: relative;
  flex: 55%;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  overflow: hidden;

  /* 装饰性网格背景 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
  }
}

/* 浮动模糊光球 */
.floating-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: rgba(232, 160, 191, 0.15);  /* 玫瑰金 */
  top: -80px;
  right: -60px;
  animation: float-orb 10s ease-in-out infinite;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: rgba(100, 149, 237, 0.1);   /* 淡蓝 */
  bottom: -60px;
  left: -40px;
  animation: float-orb 8s ease-in-out infinite reverse;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: rgba(232, 160, 191, 0.12);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float-orb 12s ease-in-out infinite 3s;
}

@keyframes float-orb {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-30px); }
}

/* 品牌内容居中 */
.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 4px;
  margin: 0;
}

/* 品牌分割线 */
.brand-divider {
  width: 60px;
  height: 3px;
  background: #e8a0bf;
  margin: 20px auto;
  border-radius: 2px;
}

.brand-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  margin: 12px 0 0 0;
}

.brand-copyright {
  position: absolute;
  bottom: 40px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  z-index: 1;
}

/* ===== 右侧表单区 ===== */
.form-panel {
  flex: 45%;
  min-width: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

/* 登录卡片 */
.login-card {
  width: 400px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 48px 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);           /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(10px);   /* Safari 兼容 */
}

/* 卡片头部 */
.card-header {
  text-align: left;
  margin-bottom: 32px;

  .card-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0;
  }

  .card-subtitle {
    font-size: 14px;
    color: #8898aa;
    margin: 8px 0 0 0;
  }
}

/* MFA 标题颜色 */
.mfa-title {
  text-align: center;
}

.mfa-desc {
  text-align: center;
}

/* ===== 表单样式 ===== */
.login-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;
  }
}

/* 输入框自定义样式 */
:deep(.el-input__wrapper) {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: none;
  padding: 4px 16px;
  transition: all 0.2s ease;
}

/* 输入框聚焦发光 */
:deep(.el-input__wrapper.is-focus) {
  border-color: #e8a0bf;
  box-shadow: 0 0 0 3px rgba(232, 160, 191, 0.15);
}

/* 前缀图标颜色 */
:deep(.el-input__prefix) {
  color: #a0aec0;
}

/* 密码切换按钮 */
.password-toggle {
  cursor: pointer;
  color: #a0aec0;
  transition: color 0.2s;

  &:hover {
    color: #e8a0bf;
  }
}

/* 验证码布局 */
.captcha-wrapper {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-input {
  flex: 1;

  :deep(.el-input__wrapper) {
    border-radius: 12px;
  }
}

/* 验证码图片 - 圆角统一 + hover 效果 */
.captcha-image {
  width: 120px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  opacity: 0.9;                          /* 默认略暗 */
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;                          /* hover 时变亮 */
  }

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

/* 记住我 + 忘记密码 同一行 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .forgot-password {
    color: #e8a0bf;
    font-size: 14px;
    padding: 0;

    &:hover span {
      text-decoration: underline;
    }
  }
}

/* 登录按钮 */
.login-button {
  width: 100%;
  height: 52px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8a0bf 0%, #d486a0 100%);
  border: none;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(232, 160, 191, 0.4);
    background: linear-gradient(135deg, #e8a0bf 0%, #d486a0 100%);
  }

  &:active {
    transform: translateY(0);
  }
}

/* MFA 返回登录按钮 */
.mfa-back {
  text-align: center;
  margin-top: 20px;
}

.back-button {
  color: #8898aa !important;

  &:hover span {
    color: #e8a0bf !important;
  }
}

/* ===== 重置密码弹窗 ===== */
:deep(.reset-dialog) {
  .el-dialog__title {
    color: #1a1a2e;
  }

  .el-dialog__body {
    padding-top: 20px;
  }
}

.reset-confirm-btn {
  background: linear-gradient(135deg, #e8a0bf 0%, #d486a0 100%) !important;
  border: none !important;
}

/* ============================================
   响应式 - 移动端
   ============================================ */
@media (max-width: 768px) {
  /* 左侧品牌区隐藏 */
  .brand-panel {
    display: none;
  }

  /* 右侧表单区占满 */
  .form-panel {
    flex: 100%;
    min-width: 0;
  }

  /* 卡片宽度自适应 */
  .login-card {
    width: 90%;
    padding: 36px 28px;
  }

  .card-title {
    font-size: 22px;
  }
}
</style>
