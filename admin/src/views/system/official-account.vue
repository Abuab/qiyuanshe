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
            <img
              v-if="qrcodeUrl"
              :src="qrcodeUrl"
              class="qrcode-img"
              alt="公众号二维码"
            />
            <div v-else class="qrcode-empty">
              <el-icon :size="48"><PictureFilled /></el-icon>
              <p>暂未设置二维码</p>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="更换二维码">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            accept="image/jpeg,image/png"
          >
            <el-button type="primary">
              <el-icon class="el-icon--left"><Upload /></el-icon>
              选择图片
            </el-button>
          </el-upload>
          <div class="upload-tip">
            仅支持 JPG / PNG 格式，大小不超过 2MB
          </div>
        </el-form-item>

        <el-form-item v-if="previewUrl">
          <div class="file-preview">
            <img
              :src="previewUrl"
              class="qrcode-img"
              alt="预览"
            />
            <div class="file-name">{{ selectedFile?.name }}</div>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="uploading"
            :disabled="!selectedFile"
            @click="handleUpload"
          >
            {{ uploading ? '上传中...' : '确认上传' }}
          </el-button>
          <el-button
            v-if="qrcodeUrl"
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
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const uploading = ref(false)
const deleting = ref(false)

const fetchQrcode = async () => {
  try {
    const res = await adminSystem.getConfigByKey('officialAccountQrcode')
    if (res.success && res.data) {
      qrcodeUrl.value = res.data
    }
  } catch {
    // ignore
  }
}

const handleFileChange = (uploadFile: any) => {
  const file = uploadFile.raw as File
  if (!file) return

  // 格式校验
  const allowedTypes = ['image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('仅支持 JPG / PNG 格式的图片')
    return
  }

  // 大小校验
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 2MB')
    return
  }

  // 释放旧的 blob URL
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

const handleUpload = async () => {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    // 1. 上传图片
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    const uploadRes = await adminSystem.upload(formData)

    if (!uploadRes.success || !uploadRes.data?.url) {
      ElMessage.error(uploadRes.message || '图片上传失败')
      return
    }

    // 2. 保存配置
    await adminSystem.updateConfig('officialAccountQrcode', uploadRes.data.url)

    // 加时间戳打破 img 缓存
    qrcodeUrl.value = uploadRes.data.url + '?t=' + Date.now()
    selectedFile.value = null
    // 释放 blob URL
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = ''
    ElMessage.success('二维码已更新')
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
  } finally {
    uploading.value = false
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

.qrcode-img {
  width: 240px;
  height: 240px;
  object-fit: contain;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.file-name {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
}
</style>
