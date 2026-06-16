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
                  v-if="basicConfig.logo && !logoError"
                  :src="basicConfig.logo"
                  class="logo-preview"
                  fit="contain"
                  @error="logoError = true"
                  @load="logoError = false"
                >
                  <template #error>
                    <div class="image-error-slot"></div>
                  </template>
                </el-image>
                <div v-if="logoError" class="logo-broken">
                  <span class="broken-text">图片加载失败，请重新上传</span>
                </div>
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
            <el-divider content-position="left">会员套餐</el-divider>

            <el-form-item label="套餐名称">
              <el-input v-model="vipConfig.packageName" placeholder="请输入套餐名称，如：月度会员" />
            </el-form-item>

            <el-form-item label="套餐价格">
              <el-input-number
                v-model="vipConfig.price"
                :min="0"
                :precision="2"
              />
              <span class="unit">元</span>
            </el-form-item>

            <el-form-item label="套餐时长">
              <el-input-number
                v-model="vipConfig.days"
                :min="1"
              />
              <span class="unit">天</span>
            </el-form-item>

            <el-form-item label="展示文案">
              <el-input
                v-model="vipConfig.displayText"
                type="textarea"
                :rows="3"
                placeholder="请输入套餐展示文案"
              />
            </el-form-item>

            <el-form-item label="套餐图片">
              <div class="upload-item">
                <el-image
                  v-if="vipConfig.image && !vipImageError"
                  :src="vipConfig.image"
                  class="logo-preview"
                  fit="contain"
                  @error="vipImageError = true"
                  @load="vipImageError = false"
                />
                <el-upload
                  action="#"
                  :http-request="uploadVipImage"
                  :show-file-list="false"
                  accept="image/*"
                >
                  <el-button type="primary">上传图片</el-button>
                </el-upload>
                <el-button v-if="vipConfig.image" type="danger" link @click="vipConfig.image = ''">删除图片</el-button>
              </div>
            </el-form-item>

            <el-divider content-position="left">其他设置</el-divider>

            <el-form-item label="非会员每日聊天限制">
              <el-input-number
                v-model="vipConfig.freeChatLimit"
                :min="0"
              />
              <span class="unit">条/天</span>
            </el-form-item>

            <el-form-item label="会员权益说明">
              <el-input
                v-model="vipConfig.vipBenefits"
                type="textarea"
                :rows="4"
                placeholder="请输入会员权益说明"
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

      <el-tab-pane label="通知通道" name="notify">
        <el-card class="config-card">
          <el-form :model="notifyConfig" label-width="140px">
            <el-form-item label="启用通知">
              <el-switch v-model="notifyConfig.enabled" />
            </el-form-item>
            <el-form-item label="通知方式">
              <el-select v-model="notifyConfig.channel" placeholder="请选择通知方式" style="width: 200px">
                <el-option label="企业微信" value="wecom" />
                <el-option label="飞书" value="feishu" />
                <el-option label="钉钉" value="dingtalk" />
              </el-select>
            </el-form-item>
            <el-form-item label="Webhook地址">
              <el-input v-model="notifyConfig.webhookUrl" placeholder="请输入机器人Webhook地址" />
              <div v-if="webhookHint" class="webhook-hint">{{ webhookHint }}</div>
            </el-form-item>
            <el-form-item label="通知类型">
              <el-checkbox-group v-model="notifyConfig.notifyTypes">
                <el-checkbox label="photo" value="photo">图片审核</el-checkbox>
                <el-checkbox label="user" value="user">用户资料审核</el-checkbox>
                <el-checkbox label="report" value="report">举报通知</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="简介模板" name="intro">
        <el-card class="config-card">
          <el-form :model="introConfig" label-width="140px">
            <el-form-item label="模板格式">
              <el-input
                v-model="introConfig.template"
                type="textarea"
                :rows="4"
                placeholder="我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}"
              />
              <div class="form-tip">
                可用变量：<code>{character}</code>（性格）、<code>{hobby}</code>（爱好）、<code>{loveRule}</code>（恋爱准则）、<code>{hopeTa}</code>（希望TA）
              </div>
            </el-form-item>
            <el-form-item label="分隔符">
              <el-input
                v-model="introConfig.separator"
                placeholder="、"
                style="width: 120px"
              />
              <div class="form-tip">多选标签之间的连接符号，默认顿号「、」</div>
            </el-form-item>
            <el-form-item label="预览">
              <el-alert type="info" :closable="false" show-icon>
                <template #title>
                  <span class="preview-text">{{ introPreview }}</span>
                </template>
              </el-alert>
              <div class="form-tip" style="margin-top:4px">以上为完整填写效果，部分缺失时自动跳过空项</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="图标配置" name="icon">
        <el-card class="config-card">
          <el-alert type="info" :closable="false" show-icon class="icon-tip">
            <template #title>
              上传 PNG 图标后小程序端实时生效；留空则使用本地默认图标。
            </template>
          </el-alert>

          <el-divider content-position="left">底部 TabBar 图标</el-divider>
          <div class="icon-grid">
            <div
              v-for="item in tabbarIconList"
              :key="item.key"
              class="icon-upload-item"
            >
              <div class="icon-label">{{ item.label }}</div>
              <div class="icon-preview-row">
                <div class="icon-preview-box">
                  <el-image
                    v-if="iconConfig.tabbar[item.key].default"
                    :src="iconConfig.tabbar[item.key].default"
                    fit="contain"
                    class="icon-preview-img"
                  />
                  <span v-else class="icon-empty">默认</span>
                  <el-upload
                    action="#"
                    :http-request="(opts: any) => uploadIcon(opts, 'tabbar', item.key, 'default')"
                    :show-file-list="false"
                  >
                    <el-button size="small" link>上传默认</el-button>
                  </el-upload>
                </div>
                <div class="icon-preview-box">
                  <el-image
                    v-if="iconConfig.tabbar[item.key].active"
                    :src="iconConfig.tabbar[item.key].active"
                    fit="contain"
                    class="icon-preview-img"
                  />
                  <span v-else class="icon-empty active">选中</span>
                  <el-upload
                    action="#"
                    :http-request="(opts: any) => uploadIcon(opts, 'tabbar', item.key, 'active')"
                    :show-file-list="false"
                  >
                    <el-button size="small" link>上传选中</el-button>
                  </el-upload>
                </div>
              </div>
            </div>
          </div>

          <el-divider content-position="left">页面内图标</el-divider>
          <div class="icon-grid">
            <div
              v-for="item in pageIconList"
              :key="item.key"
              class="icon-upload-item"
            >
              <div class="icon-label">{{ item.label }}</div>
              <div class="icon-preview-box">
                <el-image
                  v-if="iconConfig.page[item.key]"
                  :src="iconConfig.page[item.key]"
                  fit="contain"
                  class="icon-preview-img"
                />
                <span v-else class="icon-empty">未上传</span>
                <el-upload
                  action="#"
                  :http-request="(opts: any) => uploadIcon(opts, 'page', item.key)"
                  :show-file-list="false"
                >
                  <el-button size="small" link>上传图标</el-button>
                </el-upload>
              </div>
            </div>
          </div>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { system, adminSystem } from '../../api'
import { useSystemStore } from '../../store/system'

const activeTab = ref('basic')
const saving = ref(false)
const systemStore = useSystemStore()
const logoError = ref(false)
const vipImageError = ref(false)

const basicConfig = reactive({
  appName: '',
  splashText: '正在为您寻找心仪的对象...',
  servicePhone: '',
  serviceWechat: '',
  logo: '',
  aboutUs: '',
})

const shareConfig = reactive({
  shareTitle: '我在等你，快来认识我吧！',
  shareDesc: '一个真诚的婚恋平台',
  shareImage: '',
  posterTemplates: '[]',
})

const vipConfig = reactive({
  packageName: '',
  price: 99,
  days: 30,
  displayText: '',
  image: '',
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

const notifyConfig = reactive({
  enabled: false,
  channel: 'wecom',
  webhookUrl: '',
  notifyTypes: ['photo'] as string[],
})
const _realWebhookUrl = ref('')
const webhookHint = computed(() => {
  if (!_realWebhookUrl.value) return ''
  return '当前地址: ' + _realWebhookUrl.value.slice(0, -6) + '******'
})

const auditConfig = reactive({
  tencentSecretId: '',
  tencentSecretKey: '',
  aiAuditEnabled: true,
  sensitiveWords: '',
  manualAuditEnabled: true,
})

const introConfig = reactive({
  template: '我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}',
  separator: '、',
})

const tabbarIconList = [
  { key: 'home', label: '首页' },
  { key: 'dynamic', label: '动态' },
  { key: 'vip', label: '会员' },
  { key: 'message', label: '消息' },
  { key: 'my', label: '我的' },
]

const pageIconList = [
  { key: 'dynamicHome', label: '动态页返回首页' },
  { key: 'copy', label: '复制ID图标' },
  { key: 'heartFill', label: '心形填充(通用)' },
  { key: 'qaIcon', label: '我的问答图标' },
  { key: 'matchmakerIcon', label: '专属红娘图标' },
  { key: 'oaHeart', label: '公众号心形图标' },
  { key: 'footerHeart', label: '底部陪伴心形' },
  { key: 'myPhotos', label: '我的相册' },
  { key: 'loveQuotes', label: '爱情语录' },
  { key: 'myGifts', label: '我的礼物' },
  { key: 'privacy', label: '隐私设置' },
  { key: 'feedback', label: '问题反馈' },
  { key: 'userAgreement', label: '用户协议' },
  { key: 'antiFraud', label: '防骗提醒' },
  { key: 'copyIcon', label: '红娘弹窗-复制图标' },
  { key: 'saveIcon', label: '红娘弹窗-保存图标' },
  { key: 'shareFriendIcon', label: '用户详情-分享好友图标' },
  { key: 'posterIcon', label: '用户详情-生成海报图标' },
  { key: 'shareMoreIcon', label: '用户详情-右上角分享图标' },
  { key: 'followIcon', label: '用户详情-关注图标' },
  { key: 'shareBtnIcon', label: '用户详情-分享按钮图标' },
  { key: 'realNameIcon', label: '已实名图标' },
  { key: 'messageNotifyIcon', label: '消息-系统通知图标' },
  { key: 'matchmakerEyeIcon', label: '红娘牵线-眼睛图标' },
]

interface TabbarIconItem {
  default: string
  active: string
}

const iconConfig = reactive({
  tabbar: {
    home: { default: '', active: '' },
    dynamic: { default: '', active: '' },
    vip: { default: '', active: '' },
    message: { default: '', active: '' },
    my: { default: '', active: '' },
  } as Record<string, TabbarIconItem>,
  menu: {
    vipCenter: '',
    activities: '',
    answers: '',
    follows: '',
    visitors: '',
    photos: '',
    realnameAuth: '',
    help: '',
    settings: '',
  } as Record<string, string>,
  page: {
    dynamicHome: '',
    copy: '',
    heartFill: '',
    qaIcon: '',
    matchmakerIcon: '',
    oaHeart: '',
    footerHeart: '',
    myPhotos: '',
    loveQuotes: '',
    myGifts: '',
    privacy: '',
    feedback: '',
    userAgreement: '',
    antiFraud: '',
    copyIcon: '',
    saveIcon: '',
    shareFriendIcon: '',
    posterIcon: '',
    shareMoreIcon: '',
    followIcon: '',
    shareBtnIcon: '',
  } as Record<string, string>,
})

// 模拟预览：与后端 buildIntroFromUser 同逻辑
const introPreview = computed(() => {
  const demo = {
    character: ['温柔体贴', '开朗积极'],
    hobby: ['旅行', '美食', '看电影'],
    loveRule: ['宁缺也毋滥', '恋爱以结婚为目的'],
    hopeTa: ['成熟稳重', '有责任心'],
  }
  const map: Record<string, string> = {}
  for (const [k, v] of Object.entries(demo)) {
    map[k] = v.length > 0 ? v.join(introConfig.separator) : ''
  }
  let result = introConfig.template
  for (const [key, value] of Object.entries(map)) {
    if (value) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    } else {
      result = result.replace(new RegExp(`，?[^，]*?\\{${key}\\}[^，]*，?`, 'g'), '')
    }
  }
  return result
    .replace(/，+/g, '，')
    .replace(/^，+/, '')
    .replace(/，+$/, '')
    .trim()
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
      // 通知通道
      if (res.data.notify) {
        Object.assign(notifyConfig, res.data.notify)
        if (notifyConfig.webhookUrl && notifyConfig.webhookUrl.length > 6) {
          _realWebhookUrl.value = notifyConfig.webhookUrl
          notifyConfig.webhookUrl = notifyConfig.webhookUrl.slice(0, -6) + '******'
        }
      }
      // 简介模板
      if (res.data.intro) {
        Object.assign(introConfig, res.data.intro)
      }
      // 图标配置
      if (res.data.icon) {
        Object.assign(iconConfig.tabbar, res.data.icon.tabbar || {})
        Object.assign(iconConfig.menu, res.data.icon.menu || {})
        Object.assign(iconConfig.page, res.data.icon.page || {})
      }
      // 重新加载配置时重置图片错误状态，让 el-image 重新尝试加载
      logoError.value = false
    }
  } catch (error) {
    console.error(error)
  }
}

async function handleSave() {
  saving.value = true
  try {
    // 如果 webhook 未被修改（仍以 ****** 结尾），还原真实地址
    const webhookToSave = notifyConfig.webhookUrl.endsWith('******')
      ? _realWebhookUrl.value
      : notifyConfig.webhookUrl

    const configs = {
      basic: { ...basicConfig },
      share: { ...shareConfig },
      vip: { ...vipConfig },
      payment: { ...paymentConfig },
      audit: { ...auditConfig },
      notify: { ...notifyConfig, webhookUrl: webhookToSave },
      intro: { ...introConfig },
      icon: {
        tabbar: { ...iconConfig.tabbar },
        menu: { ...iconConfig.menu },
        page: { ...iconConfig.page },
      },
    }
    const res = await adminSystem.saveConfigs(configs)
    if (res.success) {
      // 保存后重新脱敏显示 webhook 地址
      if (webhookToSave && webhookToSave.length > 6) {
        _realWebhookUrl.value = webhookToSave
        notifyConfig.webhookUrl = webhookToSave.slice(0, -6) + '******'
      } else {
        _realWebhookUrl.value = webhookToSave || ''
      }
      // 直接写入 store + localStorage，持久化，刷新也不会丢
      systemStore.setAppName(basicConfig.appName)
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
      logoError.value = false
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

async function uploadVipImage(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      vipConfig.image = res.data.url
      vipImageError.value = false
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

async function uploadIcon(
  options: any,
  group: 'tabbar' | 'menu' | 'page',
  key: string,
  subKey?: 'default' | 'active',
) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      if (group === 'tabbar' && subKey) {
        iconConfig.tabbar[key][subKey] = res.data.url
      } else {
        iconConfig[group][key] = res.data.url
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
  }

  .webhook-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    font-family: monospace;
    word-break: break-all;
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

    .logo-broken {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border: 1px dashed #dcdfe6;
      border-radius: 4px;
      background: #fafafa;

      .broken-text {
        font-size: 11px;
        color: #c0c4cc;
        text-align: center;
        padding: 4px;
        line-height: 1.4;
      }
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

.preview-text {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}

code {
  background: #f0f2f5;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #e74c3c;
}

.icon-tip {
  margin-bottom: 16px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.icon-upload-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;

  .icon-label {
    font-size: 14px;
    color: #606266;
    margin-bottom: 10px;
    text-align: center;
  }

  .icon-preview-row {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .icon-preview-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .icon-preview-img {
    width: 48px;
    height: 48px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }

  .icon-empty {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
    font-size: 12px;
    color: #c0c4cc;

    &.active {
      color: #ff6b9d;
    }
  }
}
</style>
