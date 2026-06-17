<template>
  <div class="vip-page-config">
    <div class="page-header">
      <h2 class="page-title">会员页面配置</h2>
      <p class="page-desc">管理小程序会员页面的展示内容，保存后实时生效</p>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- ============ Tab 1: 定制会员页 ============ -->
      <el-tab-pane label="定制会员页" name="custom">
        <el-card class="config-card" v-loading="customLoading">
          <template #header><span class="card-title">定制会员页配置</span></template>

          <!-- Banner 图 -->
          <el-form-item label="顶部 Banner">
            <div class="upload-row">
              <el-image v-if="customForm.bannerUrl" :src="customForm.bannerUrl" fit="cover" class="banner-preview" />
              <el-upload action="#" :http-request="(opts: any) => uploadImage(opts, (url: string) => customForm.bannerUrl = url)" :show-file-list="false">
                <el-button type="primary">上传 Banner</el-button>
              </el-upload>
              <el-button v-if="customForm.bannerUrl" link type="danger" @click="customForm.bannerUrl = ''">清除</el-button>
            </div>
          </el-form-item>

          <el-divider />

          <!-- 适合人群标题 -->
          <el-form-item label="适合人群标题">
            <el-input v-model="customForm.suitableTitle" placeholder="哪些人适合1对1定制服务" maxlength="30" />
          </el-form-item>

          <!-- 四列图标网格 -->
          <el-form-item label="适合人群 (4格)">
            <div class="grid-editor">
              <div v-for="(item, idx) in customForm.suitableList" :key="idx" class="grid-card">
                <div class="grid-card-header">
                  <span>第 {{ idx + 1 }} 格</span>
                  <el-button link type="danger" size="small" @click="customForm.suitableList.splice(idx, 1)">删除</el-button>
                </div>
                <el-input v-model="item.icon" placeholder="图标(emoji)" class="grid-input" maxlength="4" />
                <el-input v-model="item.name" placeholder="名称" class="grid-input" maxlength="10" />
                <el-input v-model="item.desc" placeholder="描述" class="grid-input" maxlength="12" />
                <div class="color-row">
                  <span class="color-label">背景色</span>
                  <el-color-picker v-model="item.color" size="small" />
                  <el-input v-model="item.color" placeholder="#FFF0F3" size="small" style="width:100px" />
                </div>
              </div>
              <el-button v-if="customForm.suitableList.length < 8" @click="addSuitableItem">+ 添加一项</el-button>
            </div>
          </el-form-item>

          <el-divider />

          <!-- 专属服务标题 -->
          <el-form-item label="专属服务标题">
            <el-input v-model="customForm.serviceTitle" placeholder="专属服务 助你脱单" maxlength="30" />
          </el-form-item>

          <!-- 服务列表 -->
          <el-form-item label="服务列表">
            <div class="service-editor">
              <div v-for="(item, idx) in customForm.serviceList" :key="idx" class="service-card">
                <div class="service-card-header">
                  <span>服务 {{ idx + 1 }}</span>
                  <el-button link type="danger" size="small" @click="customForm.serviceList.splice(idx, 1)">删除</el-button>
                </div>
                <el-row :gutter="12">
                  <el-col :span="4">
                    <el-input v-model="item.icon" placeholder="图标" maxlength="4" />
                  </el-col>
                  <el-col :span="4">
                    <div class="color-row">
                      <el-color-picker v-model="item.color" size="small" />
                    </div>
                  </el-col>
                  <el-col :span="16">
                    <el-input v-model="item.name" placeholder="标题" maxlength="20" />
                  </el-col>
                </el-row>
                <el-input v-model="item.desc" placeholder="描述" maxlength="100" style="margin-top:8px" />
              </div>
              <el-button v-if="customForm.serviceList.length < 20" @click="addServiceItem">+ 添加服务</el-button>
            </div>
          </el-form-item>

          <div class="card-footer">
            <el-button type="primary" @click="saveCustom" :loading="customSaving">保存配置</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ============ Tab 2: 关于我们页 ============ -->
      <el-tab-pane label="关于我们页" name="about">
        <el-card class="config-card" v-loading="aboutLoading">
          <template #header><span class="card-title">关于我们页配置</span></template>

          <!-- Banner 图 -->
          <el-form-item label="顶部 Banner">
            <div class="upload-row">
              <el-image v-if="aboutForm.bannerUrl" :src="aboutForm.bannerUrl" fit="cover" class="banner-preview" />
              <el-upload action="#" :http-request="(opts: any) => uploadImage(opts, (url: string) => aboutForm.bannerUrl = url)" :show-file-list="false">
                <el-button type="primary">上传 Banner</el-button>
              </el-upload>
              <el-button v-if="aboutForm.bannerUrl" link type="danger" @click="aboutForm.bannerUrl = ''">清除</el-button>
            </div>
          </el-form-item>

          <el-divider />

          <el-form-item label="标题">
            <el-input v-model="aboutForm.title" placeholder="平台特点" maxlength="20" />
          </el-form-item>

          <!-- 特点列表 -->
          <el-form-item label="平台特点">
            <div class="service-editor">
              <div v-for="(item, idx) in aboutForm.features" :key="idx" class="service-card">
                <div class="service-card-header">
                  <span>特点 {{ idx + 1 }}</span>
                  <el-button link type="danger" size="small" @click="aboutForm.features.splice(idx, 1)">删除</el-button>
                </div>
                <el-row :gutter="12">
                  <el-col :span="4">
                    <el-input v-model="item.icon" placeholder="图标" maxlength="4" />
                  </el-col>
                  <el-col :span="4">
                    <el-color-picker v-model="item.color" size="small" />
                  </el-col>
                  <el-col :span="16">
                    <el-input v-model="item.name" placeholder="标题" maxlength="20" />
                  </el-col>
                </el-row>
                <el-input v-model="item.desc" placeholder="描述" maxlength="100" style="margin-top:8px" />
              </div>
              <el-button v-if="aboutForm.features.length < 10" @click="addAboutFeature">+ 添加特点</el-button>
            </div>
          </el-form-item>

          <div class="card-footer">
            <el-button type="primary" @click="saveAbout" :loading="aboutSaving">保存配置</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ============ Tab 3: 安全提示 ============ -->
      <el-tab-pane label="安全提示" name="safety">
        <el-card class="config-card" v-loading="safetyLoading">
          <template #header><span class="card-title">安全征婚提示配置</span></template>

          <el-form-item label="提示文案">
            <div class="safety-editor">
              <div v-for="(tip, idx) in safetyTipsForm.tips" :key="idx" class="safety-row">
                <el-input v-model="safetyTipsForm.tips[idx]" :placeholder="`第 ${idx + 1} 条提示`" maxlength="50">
                  <template #prepend>{{ idx + 1 }}</template>
                </el-input>
                <el-button link type="danger" @click="safetyTipsForm.tips.splice(idx, 1)">删除</el-button>
              </div>
              <el-button @click="safetyTipsForm.tips.push('')">+ 添加提示</el-button>
            </div>
          </el-form-item>

          <div class="card-footer">
            <el-button type="primary" @click="saveSafetyTips" :loading="safetySaving">保存配置</el-button>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { vipConfig } from '../../api/vip'
import { adminSystem } from '../../api/system'

const activeTab = ref('custom')

// ===== 定制会员页 =====
const customLoading = ref(false)
const customSaving = ref(false)

const customForm = reactive({
  bannerUrl: '',
  suitableTitle: '哪些人适合1对1定制服务',
  suitableList: [] as { icon: string; name: string; desc: string; color: string }[],
  serviceTitle: '专属服务 助你脱单',
  serviceList: [] as { icon: string; name: string; desc: string; color: string }[],
})

// ===== 关于我们页 =====
const aboutLoading = ref(false)
const aboutSaving = ref(false)

const aboutForm = reactive({
  bannerUrl: '',
  title: '平台特点',
  features: [] as { icon: string; name: string; desc: string; color: string }[],
})

// ===== 安全提示 =====
const safetyLoading = ref(false)
const safetySaving = ref(false)
const safetyTipsForm = reactive({ tips: [] as string[] })

// ===== 图片上传 =====
async function uploadImage(options: any, setUrl: (url: string) => void) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res: any = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      setUrl(res.data.url)
      ElMessage.success('上传成功')
    } else {
      ElMessage.error('上传失败')
    }
  } catch {
    ElMessage.error('上传失败')
  }
}

// ===== 定制会员 - 数据加载/保存 =====
async function loadCustom() {
  customLoading.value = true
  try {
    const res: any = await vipConfig.getCustom()
    if (res) {
      customForm.bannerUrl = res.bannerUrl || ''
      customForm.suitableTitle = res.suitableTitle || '哪些人适合1对1定制服务'
      customForm.suitableList = res.suitableList?.length ? res.suitableList : defaultSuitableList()
      customForm.serviceTitle = res.serviceTitle || '专属服务 助你脱单'
      customForm.serviceList = res.serviceList?.length ? res.serviceList : defaultServiceList()
    } else {
      resetCustomDefaults()
    }
  } catch {
    resetCustomDefaults()
  } finally {
    customLoading.value = false
  }
}

async function saveCustom() {
  customSaving.value = true
  try {
    await vipConfig.saveCustom({ ...customForm })
    ElMessage.success('定制会员页配置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    customSaving.value = false
  }
}

// ===== 关于我们 - 数据加载/保存 =====
async function loadAbout() {
  aboutLoading.value = true
  try {
    const res: any = await vipConfig.getAbout()
    if (res) {
      aboutForm.bannerUrl = res.bannerUrl || ''
      aboutForm.title = res.title || '平台特点'
      aboutForm.features = res.features?.length ? res.features : defaultFeatures()
    } else {
      resetAboutDefaults()
    }
  } catch {
    resetAboutDefaults()
  } finally {
    aboutLoading.value = false
  }
}

async function saveAbout() {
  aboutSaving.value = true
  try {
    await vipConfig.saveAbout({ ...aboutForm })
    ElMessage.success('关于我们页配置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    aboutSaving.value = false
  }
}

// ===== 安全提示 - 数据加载/保存 =====
async function loadSafetyTips() {
  safetyLoading.value = true
  try {
    const res: any = await vipConfig.getSafetyTips()
    safetyTipsForm.tips = res?.tips?.length ? res.tips : defaultSafetyTips()
  } catch {
    safetyTipsForm.tips = defaultSafetyTips()
  } finally {
    safetyLoading.value = false
  }
}

async function saveSafetyTips() {
  safetySaving.value = true
  try {
    const filtered = safetyTipsForm.tips.filter(t => t.trim())
    await vipConfig.saveSafetyTips(filtered)
    ElMessage.success('安全提示配置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    safetySaving.value = false
  }
}

// ===== 默认值 =====
function defaultSuitableList() {
  return [
    { icon: '💼', name: '工作繁忙', desc: '没时间自己筛选', color: '#FFF0F3' },
    { icon: '🎯', name: '目标明确', desc: '想找特定类型', color: '#F0F0FF' },
    { icon: '🔒', name: '注重隐私', desc: '不愿公开信息', color: '#FFF8E1' },
    { icon: '⚡', name: '追求效率', desc: '希望快速脱单', color: '#E8F5E9' },
  ]
}

function defaultServiceList() {
  return [
    { icon: '🎯', name: '精准1对1匹配', desc: '红娘根据您的条件精准筛选推荐', color: '#FFF0F3' },
    { icon: '💌', name: '红娘主动推荐', desc: '专业红娘主动为您匹配合适人选', color: '#F0F0FF' },
    { icon: '👑', name: '开放隐藏会员', desc: '解锁隐藏优质会员资料查看权限', color: '#FFF8E1' },
    { icon: '⭐', name: '优先优质配对', desc: '平台优先推荐优质匹配对象', color: '#E8F5E9' },
    { icon: '💡', name: '情感指导服务', desc: '专业情感顾问一对一指导', color: '#FCE4EC' },
    { icon: '📸', name: '个人形象提升', desc: '专业团队帮您打造最佳形象', color: '#E3F2FD' },
    { icon: '🤝', name: '线下约见服务', desc: '协助安排安全舒适的线下见面', color: '#FFF3E0' },
    { icon: '📊', name: '及时反馈结果', desc: '定期反馈匹配进展和优化建议', color: '#F3E5F5' },
  ]
}

function defaultFeatures() {
  return [
    { icon: '👥', name: '真实海量本地用户', desc: '严格审核机制，确保用户真实可靠', color: '#FFF0F3' },
    { icon: '🤝', name: '靠谱本地服务团队', desc: '专业红娘团队，深耕本地婚恋市场', color: '#F0F0FF' },
    { icon: '💍', name: '匹配资源丰富脱单效率高', desc: '海量优质资源，智能匹配快速脱单', color: '#FFF8E1' },
    { icon: '👑', name: '私人定制专享红娘服务', desc: '一对一专属服务，全程陪伴指导', color: '#E8F5E9' },
  ]
}

function defaultSafetyTips() {
  return [
    '请认准平台官方客服，谨防冒充人员',
    '首次见面请选择公共场合，确保安全',
    '交往过程中请勿轻易转账、借贷',
    '如遇可疑行为请及时向平台举报',
    '平台将对违规用户进行封禁处理',
  ]
}

function resetCustomDefaults() {
  customForm.bannerUrl = ''
  customForm.suitableTitle = '哪些人适合1对1定制服务'
  customForm.suitableList = defaultSuitableList()
  customForm.serviceTitle = '专属服务 助你脱单'
  customForm.serviceList = defaultServiceList()
}

function resetAboutDefaults() {
  aboutForm.bannerUrl = ''
  aboutForm.title = '平台特点'
  aboutForm.features = defaultFeatures()
}

// ===== 添加/删除项 =====
function addSuitableItem() {
  customForm.suitableList.push({ icon: '', name: '', desc: '', color: '#FFF0F3' })
}

function addServiceItem() {
  customForm.serviceList.push({ icon: '', name: '', desc: '', color: '#FFF0F3' })
}

function addAboutFeature() {
  aboutForm.features.push({ icon: '', name: '', desc: '', color: '#FFF0F3' })
}

onMounted(() => {
  loadCustom()
  loadAbout()
  loadSafetyTips()
})
</script>

<style lang="scss" scoped>
.vip-page-config {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.config-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }
}

.config-card {
  max-width: 900px;

  .card-title {
    font-size: 15px;
    font-weight: 600;
  }
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-preview {
  width: 200px;
  height: 80px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  object-fit: cover;
}

.card-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

.grid-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.grid-card {
  width: 220px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.grid-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.grid-input {
  margin-bottom: 6px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-label {
  font-size: 12px;
  color: #909399;
}

.service-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.service-card {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.service-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.safety-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.safety-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
