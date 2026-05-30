<template>
  <div class="system-config">
    <div class="page-header">
      <h2 class="page-title">系统配置</h2>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <el-tab-pane label="基础配置" name="basic">
        <el-card class="config-card">
          <el-form :model="basicConfig" label-width="140px">
            <el-form-item label="小程序名称">
              <el-input v-model="basicConfig.appName" placeholder="请输入小程序名称" />
            </el-form-item>

            <el-form-item label="开场提示文字">
              <el-input
                v-model="basicConfig.splashText"
                placeholder="请输入开场提示文字"
              />
            </el-form-item>

            <el-form-item label="客服电话">
              <el-input v-model="basicConfig.servicePhone" placeholder="请输入客服电话" />
            </el-form-item>

            <el-form-item label="客服微信">
              <el-input v-model="basicConfig.serviceWechat" placeholder="请输入客服微信" />
            </el-form-item>

            <el-form-item label="Logo上传">
              <div class="upload-item">
                <el-image
                  v-if="basicConfig.logo"
                  :src="basicConfig.logo"
                  class="logo-preview"
                  fit="contain"
                />
                <el-upload
                  action="#"
                  :http-request="uploadLogo"
                  :show-file-list="false"
                  class="logo-upload"
                >
                  <el-button type="primary">上传Logo</el-button>
                </el-upload>
              </div>
            </el-form-item>

            <el-form-item label="关于我们">
              <el-input
                v-model="basicConfig.aboutUs"
                type="textarea"
                :rows="4"
                placeholder="请输入关于我们内容"
              />
            </el-form-item>

            <el-form-item label="用户协议">
              <el-input
                v-model="basicConfig.userAgreement"
                type="textarea"
                :rows="4"
                placeholder="请输入用户协议内容"
              />
            </el-form-item>

            <el-form-item label="隐私政策">
              <el-input
                v-model="basicConfig.privacyPolicy"
                type="textarea"
                :rows="4"
                placeholder="请输入隐私政策内容"
              />
            </el-form-item>

            <el-form-item label="会员服务协议">
              <el-input
                v-model="basicConfig.vipAgreement"
                type="textarea"
                :rows="4"
                placeholder="请输入会员服务协议内容"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="分享配置" name="share">
        <el-card class="config-card">
          <el-form :model="shareConfig" label-width="140px">
            <el-form-item label="分享标题">
              <el-input
                v-model="shareConfig.shareTitle"
                placeholder="支持变量：{nickname}"
              />
              <div class="form-tip">支持变量：{nickname}（用户昵称）</div>
            </el-form-item>

            <el-form-item label="分享描述">
              <el-input
                v-model="shareConfig.shareDesc"
                type="textarea"
                :rows="2"
                placeholder="请输入分享描述"
              />
            </el-form-item>

            <el-form-item label="分享图片">
              <div class="upload-item">
                <el-image
                  v-if="shareConfig.shareImage"
                  :src="shareConfig.shareImage"
                  class="share-image-preview"
                  fit="contain"
                />
                <el-upload
                  action="#"
                  :http-request="uploadShareImage"
                  :show-file-list="false"
                >
                  <el-button type="primary">上传分享图片</el-button>
                </el-upload>
              </div>
              <div class="form-tip">建议尺寸：500x400</div>
            </el-form-item>

            <el-form-item label="海报模板配置">
              <el-input
                v-model="shareConfig.posterTemplates"
                type="textarea"
                :rows="6"
                placeholder="JSON格式的海报模板配置"
              />
              <div class="form-tip">
                示例格式：<br />
                [
                  {"id": 1, "bgColor": "#fff", "layout": "portrait"},
                  {"id": 2, "bgColor": "#f5f5f5", "layout": "landscape"}
                ]
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="会员配置" name="vip">
        <el-card class="config-card">
          <el-form :model="vipConfig" label-width="160px">
            <el-divider content-position="left">黄金会员</el-divider>

            <el-form-item label="黄金会员价格">
              <el-input-number
                v-model="vipConfig.goldPrice"
                :min="0"
                :precision="2"
              />
              <span class="unit">元</span>
            </el-form-item>

            <el-form-item label="黄金会员时长">
              <el-input-number
                v-model="vipConfig.goldDays"
                :min="1"
              />
              <span class="unit">月</span>
            </el-form-item>

            <el-divider content-position="left">钻石会员</el-divider>

            <el-form-item label="钻石会员价格">
              <el-input-number
                v-model="vipConfig.diamondPrice"
                :min="0"
                :precision="2"
              />
              <span class="unit">元</span>
            </el-form-item>

            <el-form-item label="钻石会员时长">
              <el-input-number
                v-model="vipConfig.diamondDays"
                :min="1"
              />
              <span class="unit">月</span>
            </el-form-item>

            <el-divider content-position="left">至尊VIP</el-divider>

            <el-form-item label="至尊VIP价格">
              <el-input-number
                v-model="vipConfig.supremePrice"
                :min="0"
                :precision="2"
              />
              <span class="unit">元</span>
            </el-form-item>

            <el-form-item label="至尊VIP时长">
              <el-input-number
                v-model="vipConfig.supremeDays"
                :min="1"
              />
              <span class="unit">月</span>
            </el-form-item>

            <el-divider content-position="left">其他设置</el-divider>

            <el-form-item label="非VIP每日聊天限制">
              <el-input-number
                v-model="vipConfig.freeChatLimit"
                :min="0"
              />
              <span class="unit">条/天</span>
            </el-form-item>

            <el-form-item label="VIP权益说明">
              <el-input
                v-model="vipConfig.vipBenefits"
                type="textarea"
                :rows="4"
                placeholder="请输入VIP权益说明"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="支付配置" name="payment">
        <el-card class="config-card">
          <el-form :model="paymentConfig" label-width="160px">
            <el-form-item label="微信支付商户号">
              <el-input
                v-model="paymentConfig.wechatMchId"
                placeholder="请输入微信支付商户号"
              />
            </el-form-item>

            <el-form-item label="API v3密钥">
              <el-input
                v-model="paymentConfig.wechatApiV3Key"
                type="password"
                placeholder="请输入API v3密钥"
                show-password
              />
            </el-form-item>

            <el-form-item label="证书文件">
              <div class="cert-upload">
                <div class="cert-item">
                  <span class="cert-label">apiclient_cert.pem:</span>
                  <el-upload
                    action="#"
                    :http-request="uploadCertFile"
                    :data="{ type: 'cert' }"
                    :show-file-list="false"
                  >
                    <el-button size="small">上传证书</el-button>
                  </el-upload>
                  <span v-if="paymentConfig.certPath" class="cert-status">
                    <el-icon color="#67C23A"><Check /></el-icon> 已上传
                  </span>
                </div>
                <div class="cert-item">
                  <span class="cert-label">apiclient_key.pem:</span>
                  <el-upload
                    action="#"
                    :http-request="uploadCertFile"
                    :data="{ type: 'key' }"
                    :show-file-list="false"
                  >
                    <el-button size="small">上传私钥</el-button>
                  </el-upload>
                  <span v-if="paymentConfig.keyPath" class="cert-status">
                    <el-icon color="#67C23A"><Check /></el-icon> 已上传
                  </span>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="支付回调URL">
              <el-input
                :model-value="paymentConfig.notifyUrl"
                disabled
              />
              <div class="form-tip">自动拼接为：https://api.xxx.com/payment/notify</div>
            </el-form-item>

            <el-form-item label="测试模式">
              <el-switch v-model="paymentConfig.testMode" />
              <div class="form-tip">启用后使用微信支付沙箱环境</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="审核配置" name="audit">
        <el-card class="config-card">
          <el-form :model="auditConfig" label-width="160px">
            <el-form-item label="腾讯云SecretId">
              <el-input
                v-model="auditConfig.tencentSecretId"
                placeholder="请输入腾讯云SecretId"
              />
            </el-form-item>

            <el-form-item label="腾讯云SecretKey">
              <el-input
                v-model="auditConfig.tencentSecretKey"
                type="password"
                placeholder="请输入腾讯云SecretKey"
                show-password
              />
            </el-form-item>

            <el-form-item label="AI审核开关">
              <el-switch v-model="auditConfig.aiAuditEnabled" />
              <div class="form-tip">启用后自动调用腾讯云内容审核服务</div>
            </el-form-item>

            <el-form-item label="敏感词库">
              <el-input
                v-model="auditConfig.sensitiveWords"
                type="textarea"
                :rows="8"
                placeholder="每行一个敏感词"
              />
              <div class="form-tip">每行一个敏感词，审核时自动过滤</div>
            </el-form-item>

            <el-form-item label="人工审核开关">
              <el-switch v-model="auditConfig.manualAuditEnabled" />
              <div class="form-tip">启用后AI审核结果需人工确认</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <div class="config-footer">
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存配置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { system, adminSystem } from '../../api'

const activeTab = ref('basic')
const saving = ref(false)

const basicConfig = reactive({
  appName: '栖缘社',
  splashText: '正在为您寻找心仪的对象...',
  servicePhone: '',
  serviceWechat: '',
  logo: '',
  aboutUs: '',
  userAgreement: '',
  privacyPolicy: '',
  vipAgreement: '',
})

const shareConfig = reactive({
  shareTitle: '我在栖缘社等你，快来认识我吧！',
  shareDesc: '一个真诚的婚恋平台',
  shareImage: '',
  posterTemplates: '[]',
})

const vipConfig = reactive({
  goldPrice: 99,
  goldDays: 1,
  diamondPrice: 249,
  diamondDays: 3,
  supremePrice: 799,
  supremeDays: 12,
  freeChatLimit: 3,
  vipBenefits: '',
})

const paymentConfig = reactive({
  wechatMchId: '',
  wechatApiV3Key: '',
  certPath: '',
  keyPath: '',
  notifyUrl: 'https://api.xxx.com/payment/notify',
  testMode: false,
})

const auditConfig = reactive({
  tencentSecretId: '',
  tencentSecretKey: '',
  aiAuditEnabled: true,
  sensitiveWords: '',
  manualAuditEnabled: true,
})

onMounted(async () => {
  await fetchConfig()
})

async function fetchConfig() {
  try {
    const res = await system.getConfigs()
    if (res.success && res.data) {
      Object.assign(basicConfig, res.data.basic || {})
      Object.assign(shareConfig, res.data.share || {})
      Object.assign(vipConfig, res.data.vip || {})
      Object.assign(paymentConfig, res.data.payment || {})
      Object.assign(auditConfig, res.data.audit || {})
    }
  } catch (error) {
    console.error(error)
  }
}

async function handleSave() {
  saving.value = true
  try {
    const configs = {
      basic: { ...basicConfig },
      share: { ...shareConfig },
      vip: { ...vipConfig },
      payment: { ...paymentConfig },
      audit: { ...auditConfig },
    }
    const res = await adminSystem.saveConfigs(configs)
    if (res.success) {
      ElMessage.success('配置保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function uploadLogo(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      basicConfig.logo = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

async function uploadShareImage(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      shareConfig.shareImage = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

async function uploadCertFile(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  formData.append('type', options.data.type)
  try {
    const res = await adminSystem.uploadCert(formData)
    if (res.success && res.data?.path) {
      if (options.data.type === 'cert') {
        paymentConfig.certPath = res.data.path
      } else {
        paymentConfig.keyPath = res.data.path
      }
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}
</script>

<style scoped lang="scss">
.system-config {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }
  }

  .config-tabs {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  }

  .config-card {
    max-width: 800px;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
  }

  .unit {
    margin-left: 8px;
    color: #606266;
  }

  .upload-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;

    .logo-preview {
      width: 80px;
      height: 80px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }

    .share-image-preview {
      width: 120px;
      height: 96px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }
  }

  .cert-upload {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .cert-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .cert-label {
        width: 160px;
        font-size: 14px;
        color: #606266;
      }

      .cert-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #67c23a;
      }
    }
  }

  .config-footer {
    margin-top: 24px;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    display: flex;
    justify-content: center;
  }
}

:deep(.el-divider__text) {
  color: #409eff;
  font-weight: 600;
}
</style>
