<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">首页浮动按钮配置</h2>
      <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
    </div>

    <el-card shadow="never" v-loading="loading">
      <el-form :model="form" label-width="120px" style="max-width: 720px">
        <el-form-item label="当前展示模式">
          <el-radio-group v-model="form.mode">
            <el-radio-button label="ask">问媒模式</el-radio-button>
            <el-radio-button label="test">测一测模式</el-radio-button>
          </el-radio-group>
          <div class="tip">
            问媒模式：点击弹出红娘联系方式；测一测模式：点击跳转人格测试答题页。
          </div>
        </el-form-item>
      </el-form>

      <div class="mode-cards">
        <el-card
          v-for="m in modes"
          :key="m.key"
          class="mode-card"
          :class="{ active: form.mode === m.key }"
          shadow="never"
        >
          <template #header>
            <div class="mode-card-header">
              <span>{{ m.label }}配置</span>
              <el-tag v-if="form.mode === m.key" type="success" size="small">生效中</el-tag>
            </div>
          </template>
          <el-form :model="form[m.key]" label-width="90px">
            <el-form-item label="按钮文案">
              <el-input v-model="form[m.key].text" maxlength="10" show-word-limit />
            </el-form-item>
            <el-form-item label="按钮图标">
              <el-input v-model="form[m.key].icon" placeholder="图标标识或图片URL" />
            </el-form-item>
            <el-form-item label="背景色">
              <el-color-picker v-model="form[m.key].bgColor" />
              <span class="color-text">{{ form[m.key].bgColor }}</span>
            </el-form-item>
            <el-form-item label="跳转目标">
              <el-input v-model="form[m.key].target" placeholder="页面路径或动作标识" />
            </el-form-item>
          </el-form>

          <!-- 实时预览 -->
          <div class="preview">
            <span class="preview-label">预览</span>
            <div class="float-btn" :style="{ background: form[m.key].bgColor }">
              {{ form[m.key].text || '按钮' }}
            </div>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { floatingButtonApi } from '../../api/guide'
import type { FloatingButtonConfig } from '../../api/guide'

const loading = ref(false)
const saving = ref(false)

const modes = [
  { key: 'ask' as const, label: '问媒模式' },
  { key: 'test' as const, label: '测一测模式' },
]

const form = reactive<FloatingButtonConfig>({
  mode: 'ask',
  ask: { text: '问媒', icon: 'chat', bgColor: '#ff6b81', target: 'action:matchmaker-contact' },
  test: { text: '测一测', icon: 'compass', bgColor: '#7c5cff', target: '/pages/personality/test' },
})

const load = async () => {
  loading.value = true
  try {
    const res = await floatingButtonApi.get()
    if (res.success && res.data) {
      Object.assign(form, res.data)
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

const handleSave = async () => {
  if (!form.ask.text.trim() || !form.test.text.trim()) {
    ElMessage.warning('两种模式的按钮文案均不能为空')
    return
  }
  saving.value = true
  try {
    await floatingButtonApi.save({ ...form })
    ElMessage.success('保存成功，已即时生效')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title { font-size: 18px; font-weight: 600; margin: 0; }
.tip { color: #909399; font-size: 12px; margin-top: 6px; }
.mode-cards { display: flex; gap: 16px; flex-wrap: wrap; }
.mode-card { flex: 1; min-width: 320px; border: 1px solid #ebeef5; }
.mode-card.active { border-color: #67c23a; }
.mode-card-header { display: flex; justify-content: space-between; align-items: center; }
.color-text { margin-left: 10px; color: #606266; font-size: 13px; }
.preview { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.preview-label { color: #909399; font-size: 12px; }
.float-btn {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>
