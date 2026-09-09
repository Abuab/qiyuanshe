<template>
  <div class="match-report-config">
    <div class="page-header">
      <h2 class="page-title">匹配分析报告配置</h2>
      <p class="page-desc">配置免费匹配分析报告的开关、免费名额、匹配池数据模式与分享卡片文案</p>
    </div>

    <el-card class="config-card">
      <el-form :model="form" label-width="160px">
        <el-form-item label="报告功能开关">
          <el-switch v-model="form.enabled" />
          <div class="form-tip">关闭后，H5 端「生成我的匹配报告」入口将不可用</div>
        </el-form-item>

        <el-form-item label="免费名额总数">
          <el-input-number v-model="form.quotaTotal" :min="0" :max="999999" />
          <span class="unit">位</span>
          <div class="form-tip">前 N 位用户可免费生成，超出后按钮置灰并提示「名额已满」</div>
        </el-form-item>

        <el-divider content-position="left">匹配池实况</el-divider>

        <el-form-item label="数据模式">
          <el-radio-group v-model="form.poolMode">
            <el-radio value="real">真实数据</el-radio>
            <el-radio value="fixed">固定文案</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.poolMode === 'fixed'" label="固定文案">
          <el-input v-model="form.poolFixedText" type="textarea" :rows="3" placeholder="匹配池固定文案" />
        </el-form-item>

        <el-divider content-position="left">分享卡片</el-divider>

        <el-form-item label="分享卡片文案">
          <el-input v-model="form.shareText" type="textarea" :rows="2" placeholder="分享卡片文案" />
        </el-form-item>

        <el-form-item label="H5 报告页地址">
          <el-input v-model="form.h5ReportUrl" placeholder="例如 https://xxx.com/#/pages/match-report/index" />
          <div class="form-tip">用于生成分享卡片上的二维码，留空则不下发二维码</div>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="config-footer">
      <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { system, adminSystem } from '../../api'

const saving = ref(false)

const form = reactive({
  enabled: true,
  quotaTotal: 100,
  poolMode: 'real' as 'real' | 'fixed',
  poolFixedText: '',
  shareText: '',
  h5ReportUrl: '',
})

onMounted(async () => {
  await fetchConfig()
})

async function fetchConfig() {
  try {
    const res = await system.getConfigs()
    const cfg = res.data?.matchReport
    if (cfg) {
      form.enabled = cfg.enabled !== undefined ? !!cfg.enabled : true
      form.quotaTotal = typeof cfg.quotaTotal === 'number' ? cfg.quotaTotal : 100
      form.poolMode = cfg.poolMode === 'fixed' ? 'fixed' : 'real'
      form.poolFixedText = cfg.poolFixedText || ''
      form.shareText = cfg.shareText || ''
      form.h5ReportUrl = cfg.h5ReportUrl || ''
    }
  } catch (error) {
    ElMessage.error('获取匹配报告配置失败')
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm('重置将丢弃当前未保存的修改，确定继续？', '确认重置', { type: 'warning' })
    await fetchConfig()
    ElMessage.success('已重置')
  } catch {
    // 用户取消
  }
}

async function handleSave() {
  saving.value = true
  try {
    const res = await adminSystem.saveConfigs({
      matchReport: { ...form },
    })
    if (res.success) {
      ElMessage.success('匹配报告配置保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.match-report-config {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 8px 0;
    }

    .page-desc {
      font-size: 13px;
      color: #909399;
      margin: 0;
    }
  }

  .config-card {
    max-width: 720px;
  }

  .unit {
    margin-left: 8px;
    color: #606266;
    font-size: 13px;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    width: 100%;
  }

  .config-footer {
    margin-top: 24px;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  :deep(.el-divider__text) {
    color: var(--el-color-primary);
    font-weight: 600;
  }
}
</style>
