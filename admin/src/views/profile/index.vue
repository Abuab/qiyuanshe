<template>
  <div class="profile-page">
    <div class="page-header">
      <h2 class="page-title">个人中心</h2>
    </div>

    <el-row :gutter="20">
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

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="profile-card">
          <template #header>
            <span>安全设置</span>
          </template>

          <div v-if="!mfaEnabled" class="security-section">
            <el-alert
              title="建议开启双因素认证，提升账号安全性"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 20px"
            />
            <el-radio-group v-model="mfaMethod" class="mfa-method-group">
              <el-radio value="totp" border style="margin-right: 16px">
                <div class="mfa-radio-label">
                  <strong>扫码绑定</strong>
                  <p class="mfa-radio-desc">使用 Microsoft Authenticator 扫码验证</p>
                </div>
              </el-radio>
              <el-radio value="sms" border>
                <div class="mfa-radio-label">
                  <strong>短信验证</strong>
                  <p class="mfa-radio-desc">通过手机短信接收验证码</p>
                </div>
              </el-radio>
            </el-radio-group>

            <div v-if="mfaMethod === 'totp'" class="mfa-setup-totp">
              <el-button type="primary" @click="handleSetupTotp" :loading="totpLoading">
                生成绑定二维码
              </el-button>
              <div v-if="qrCodeUrl" class="qr-section">
                <img :src="qrCodeUrl" alt="TOTP QR Code" class="qr-image" />
                <p class="qr-tip">请使用 Microsoft Authenticator 扫描二维码</p>
                <el-input
                  v-model="totpCode"
                  maxlength="6"
                  placeholder="请输入6位验证码"
                  style="width: 200px; margin-top: 12px"
                />
                <el-button
                  type="success"
                  @click="handleVerifyTotp"
                  :loading="totpVerifyLoading"
                  style="margin-top: 12px"
                >
                  验证并启用
                </el-button>
              </div>
            </div>

            <div v-if="mfaMethod === 'sms'" class="mfa-setup-sms">
              <el-form :inline="true">
                <el-form-item label="手机号">
                  <el-input
                    v-model="smsPhone"
                    placeholder="请输入手机号"
                    maxlength="11"
                    style="width: 200px"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    @click="handleSendSms"
                    :loading="smsSending"
                    :disabled="smsCountdown > 0"
                  >
                    {{ smsCountdown > 0 ? smsCountdown + 's' : '发送验证码' }}
                  </el-button>
                </el-form-item>
              </el-form>
              <p class="sms-tip">验证码将显示在后端控制台日志中</p>
              <el-form :inline="true" v-if="smsSent">
                <el-form-item label="验证码">
                  <el-input
                    v-model="smsCode"
                    maxlength="6"
                    placeholder="请输入6位验证码"
                    style="width: 200px"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="success"
                    @click="handleVerifySms"
                    :loading="smsVerifyLoading"
                  >
                    验证并启用
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>

          <div v-else class="security-enabled">
            <el-alert
              :title="'当前双因素认证方式: ' + (currentMfaType === 'totp' ? '扫码验证 (Microsoft Authenticator)' : '短信验证')"
              type="success"
              :closable="false"
              show-icon
              style="margin-bottom: 20px"
            />
            <p class="disable-tip">输入当前验证码以禁用双因素认证：</p>
            <el-form :inline="true">
              <el-form-item label="验证码">
                <el-input
                  v-model="disableCode"
                  maxlength="6"
                  placeholder="请输入6位验证码"
                  style="width: 200px"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="danger"
                  @click="handleDisableMfa"
                  :loading="disableLoading"
                >
                  禁用双因素认证
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Check } from '@element-plus/icons-vue'
import { useAdminStore } from '../../store/admin'
import { adminSystem, mfaApi } from '../../api'
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

const mfaEnabled = ref(false)
const currentMfaType = ref('')
const mfaMethod = ref('totp')

const qrCodeUrl = ref('')
const totpCode = ref('')
const totpLoading = ref(false)
const totpVerifyLoading = ref(false)

const smsPhone = ref('')
const smsCode = ref('')
const smsSending = ref(false)
const smsVerifyLoading = ref(false)
const smsSent = ref(false)
const smsCountdown = ref(0)
let smsTimer: ReturnType<typeof setInterval> | null = null

const disableCode = ref('')
const disableLoading = ref(false)

onMounted(() => {
  const userInfo = adminStore.userInfo
  if (userInfo) {
    formData.nickname = userInfo.nickname || ''
    formData.username = userInfo.username || ''
    formData.avatar = userInfo.avatar || ''
    mfaEnabled.value = userInfo.mfaEnabled || false
    currentMfaType.value = userInfo.mfaType || 'none'
  }
})

onUnmounted(() => {
  if (smsTimer) {
    clearInterval(smsTimer)
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
    const updateData: any = {
      nickname: formData.nickname,
      avatar: formData.avatar,
    }

    if (formData.newPassword) {
      updateData.password = formData.newPassword
    }

    const res = await adminSystem.updateProfile(updateData)

    if (res.success) {
      adminStore.updateUserInfo({
        nickname: formData.nickname,
        avatar: formData.avatar,
      })
      ElMessage.success('保存成功')
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

async function handleSetupTotp() {
  totpLoading.value = true
  try {
    const res = await mfaApi.setupTotp()
    if (res.success) {
      qrCodeUrl.value = res.data?.qrCodeUrl || ''
      ElMessage.success('二维码已生成')
    } else {
      ElMessage.error(res.message || '生成失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败')
  } finally {
    totpLoading.value = false
  }
}

async function handleVerifyTotp() {
  if (!totpCode.value) {
    ElMessage.warning('请输入验证码')
    return
  }
  totpVerifyLoading.value = true
  try {
    const res = await mfaApi.verifyTotp(totpCode.value)
    if (res.success) {
      ElMessage.success('TOTP 绑定成功')
      mfaEnabled.value = true
      currentMfaType.value = 'totp'
      adminStore.updateUserInfo({ mfaEnabled: true, mfaType: 'totp' })
      qrCodeUrl.value = ''
      totpCode.value = ''
    } else {
      ElMessage.error(res.message || '验证失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '验证失败')
  } finally {
    totpVerifyLoading.value = false
  }
}

async function handleSendSms() {
  if (!smsPhone.value) {
    ElMessage.warning('请输入手机号')
    return
  }
  smsSending.value = true
  try {
    const res = await mfaApi.sendSms(smsPhone.value)
    if (res.success) {
      ElMessage.success('验证码已发送，请查看后端控制台日志')
      smsSent.value = true
      smsCountdown.value = 60
      smsTimer = setInterval(() => {
        smsCountdown.value--
        if (smsCountdown.value <= 0) {
          if (smsTimer) {
            clearInterval(smsTimer)
            smsTimer = null
          }
        }
      }, 1000)
    } else {
      ElMessage.error(res.message || '发送失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发送失败')
  } finally {
    smsSending.value = false
  }
}

async function handleVerifySms() {
  if (!smsCode.value) {
    ElMessage.warning('请输入验证码')
    return
  }
  smsVerifyLoading.value = true
  try {
    const res = await mfaApi.verifySms(smsPhone.value, smsCode.value)
    if (res.success) {
      ElMessage.success('短信验证已启用')
      mfaEnabled.value = true
      currentMfaType.value = 'sms'
      adminStore.updateUserInfo({ mfaEnabled: true, mfaType: 'sms' })
      smsSent.value = false
      smsCode.value = ''
    } else {
      ElMessage.error(res.message || '验证失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '验证失败')
  } finally {
    smsVerifyLoading.value = false
  }
}

async function handleDisableMfa() {
  if (!disableCode.value) {
    ElMessage.warning('请输入验证码')
    return
  }
  disableLoading.value = true
  try {
    const res = await mfaApi.disableMfa(disableCode.value)
    if (res.success) {
      ElMessage.success('双因素认证已禁用')
      mfaEnabled.value = false
      currentMfaType.value = 'none'
      adminStore.updateUserInfo({ mfaEnabled: false, mfaType: 'none' })
      disableCode.value = ''
    } else {
      ElMessage.error(res.message || '禁用失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '请求失败')
  } finally {
    disableLoading.value = false
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

.security-section {
  padding: 20px;

  .mfa-method-group {
    margin-bottom: 20px;
    display: flex;

    :deep(.el-radio) {
      height: auto;
      padding: 16px;
      margin-right: 0;
    }
  }

  .mfa-radio-label {
    strong {
      display: block;
      margin-bottom: 4px;
    }

    .mfa-radio-desc {
      color: #999;
      font-size: 12px;
      margin: 0;
    }
  }

  .qr-section {
    text-align: center;
    padding: 16px 0;

    .qr-image {
      width: 200px;
      height: 200px;
      border: 1px solid #ebeef5;
      border-radius: 8px;
    }

    .qr-tip {
      color: #666;
      font-size: 13px;
      margin: 12px 0 0;
    }
  }

  .mfa-setup-sms {
    .sms-tip {
      color: #999;
      font-size: 12px;
      margin-bottom: 12px;
    }
  }
}

.security-enabled {
  padding: 20px;

  .disable-tip {
    color: #666;
    margin-bottom: 12px;
  }
}
</style>
