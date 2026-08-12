<template>
  <div class="official-account-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>公众号二维码设置</span>
        </div>
      </template>

      <el-form label-width="120px">
        <el-form-item label="当前二维码">
          <div class="qrcode-preview">
            <el-image
              v-if="qrcodeUrl && !qrcodeError"
              :src="qrcodeUrl"
              style="width: 240px; height: 240px"
              fit="contain"
              @error="qrcodeError = true"
              @load="qrcodeError = false"
            >
              <template #error>
                <div></div>
              </template>
            </el-image>
            <div v-if="qrcodeError" class="qrcode-broken">
              <span class="broken-text">图片加载失败，请重新上传</span>
            </div>
            <div v-if="!qrcodeUrl" class="qrcode-empty">
              <el-icon :size="48"><PictureFilled /></el-icon>
              <p>暂未设置二维码</p>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="更换二维码">
          <el-upload
            action="#"
            :http-request="handleUpload"
            :show-file-list="false"
            accept="image/jpeg,image/png"
            :before-upload="beforeUpload"
          >
            <el-button type="primary">
              <el-icon class="el-icon--left"><Upload /></el-icon>
              选择图片并上传
            </el-button>
          </el-upload>
          <div class="upload-tip">
            仅支持 JPG / PNG 格式，大小不超过 2MB
          </div>
        </el-form-item>

        <el-form-item v-if="qrcodeUrl">
          <el-button
            type="danger"
            plain
            :loading="deleting"
            @click="handleDelete"
          >
            删除二维码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, PictureFilled } from '@element-plus/icons-vue'
import { adminSystem } from '../../api/system'

const qrcodeUrl = ref('')
const qrcodeError = ref(false)
const deleting = ref(false)

const fetchQrcode = async () => {
  try {
    const res = await adminSystem.getConfigByKey('officialAccountQrcode')
    if (res.success && res.data) {
      qrcodeUrl.value = res.data
    }
    qrcodeError.value = false
  } catch {
    // ignore
  }
}

const beforeUpload = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('仅支持 JPG / PNG 格式的图片')
    return false
  }
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

const handleUpload = async (options: any) => {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const uploadRes = await adminSystem.upload(formData)
    if (!uploadRes.success || !uploadRes.data?.url) {
      ElMessage.error(uploadRes.message || '图片上传失败')
      return
    }
    // 保存到系统配置
    await adminSystem.updateConfig('officialAccountQrcode', uploadRes.data.url)
    qrcodeUrl.value = uploadRes.data.url + '?t=' + Date.now()
    qrcodeError.value = false
    ElMessage.success('二维码已更新')
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
  }
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除当前公众号二维码吗？', '确认删除', {
      type: 'warning',
    })
  } catch {
    return
  }

  deleting.value = true
  try {
    await adminSystem.updateConfig('officialAccountQrcode', '')
    qrcodeUrl.value = ''
    qrcodeError.value = false
    ElMessage.success('二维码已删除')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchQrcode()
})
</script>

<style scoped>
.official-account-page {
  padding: 20px;
}

.card-header {
  font-size: 16px;
  font-weight: 500;
}

.qrcode-preview {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-empty {
  width: 240px;
  height: 240px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}

.qrcode-empty p {
  margin-top: 12px;
  font-size: 14px;
}

.qrcode-broken {
  width: 240px;
  height: 240px;
  border: 1px dashed #e6a23c;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.broken-text {
  font-size: 13px;
  color: #e6a23c;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}
</style>
