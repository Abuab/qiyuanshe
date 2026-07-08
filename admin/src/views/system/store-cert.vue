<template>
  <div class="store-cert-config-page">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>到店认证 - 门店配置</span>
        </div>
      </template>

      <el-form :model="form" label-width="120px" ref="formRef">
        <el-form-item label="门店名称">
          <el-input v-model="form.name" placeholder="如：运城店" maxlength="50" show-word-limit />
          <div class="form-tip">小程序弹窗中展示的门店名称</div>
        </el-form-item>

        <el-form-item label="门店详细地址">
          <el-input v-model="form.address" type="textarea" :rows="3" placeholder="如：运城市人民北路锦绣花城南区门面房灵通资讯负一楼" maxlength="200" show-word-limit />
          <div class="form-tip">用于小程序端展示和导航</div>
        </el-form-item>

        <el-form-item label="导航纬度 (latitude)">
          <el-input v-model="form.latitude" placeholder="如：35.0265" />
          <div class="form-tip">点击导航按钮时的目标纬度，可从腾讯地图坐标拾取器获取</div>
        </el-form-item>

        <el-form-item label="导航经度 (longitude)">
          <el-input v-model="form.longitude" placeholder="如：110.9983" />
          <div class="form-tip">点击导航按钮时的目标经度</div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
          <el-button @click="handleLoad" :loading="loading">重新加载</el-button>
        </el-form-item>
      </el-form>

      <el-divider />
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          配置说明：门店名称和地址为空时，小程序弹窗将显示"暂无门店信息"的占位提示。
          经纬度配置后，点击导航按钮将直接打开手机地图导航到指定坐标。
        </template>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

interface StoreCertForm {
  name: string
  address: string
  latitude: string
  longitude: string
}

const form = reactive<StoreCertForm>({
  name: '',
  address: '',
  latitude: '',
  longitude: '',
})

const saving = ref(false)
const loading = ref(false)

// 注：这里使用 window.fetch 直接调后端，避免依赖复杂的 admin API 层
// 管理后台的 request 拦截器会自动加上 token
async function fetchConfig(key: string): Promise<string> {
  const res = await request({ url: `/admin/system/config/${key}`, method: 'get' })
  return res?.data?.data || res?.data || ''
}

async function saveConfig(key: string, value: string): Promise<void> {
  await request({ url: `/admin/system/config/${key}`, method: 'put', data: { value } })
}

async function handleLoad() {
  loading.value = true
  try {
    form.name = await fetchConfig('storeCert.name')
    form.address = await fetchConfig('storeCert.address')
    form.latitude = await fetchConfig('storeCert.latitude')
    form.longitude = await fetchConfig('storeCert.longitude')
    ElMessage.success('配置已加载')
  } catch (e: any) {
    ElMessage.error('加载失败: ' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await Promise.all([
      saveConfig('storeCert.name', form.name),
      saveConfig('storeCert.address', form.address),
      saveConfig('storeCert.latitude', form.latitude),
      saveConfig('storeCert.longitude', form.longitude),
    ])
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e?.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  handleLoad()
})
</script>

<style lang="scss" scoped>
.store-cert-config-page {
  padding: 20px;
}
.config-card {
  .card-header {
    font-size: 16px;
    font-weight: 600;
  }
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
