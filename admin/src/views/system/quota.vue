<template>
  <div class="quota-config">
    <div class="page-header">
      <h2 class="page-title">用量限额配置</h2>
      <p class="page-desc">配置各功能模块中非会员与会员的每日/每周使用次数上限</p>
    </div>

    <el-card class="config-card">
      <el-form :model="form" label-width="160px">

        <!-- 聊天消息 -->
        <el-divider content-position="left">聊天消息</el-divider>
        <el-form-item label="非会员每对免费消息">
          <el-input-number v-model="form.chat.freePerMatch" :min="0" :max="99" />
          <span class="unit">条/对</span>
          <div class="form-tip">相互喜欢后双方各可免费发送的消息数</div>
        </el-form-item>
        <el-form-item label="会员每日消息">
          <el-input-number v-model="form.chat.vipPerDay" :min="0" :max="999" />
          <span class="unit">条/天</span>
        </el-form-item>

        <!-- AI 红娘 -->
        <el-divider content-position="left">AI 红娘</el-divider>
        <el-form-item label="非会员每日次数">
          <el-input-number v-model="form.matchmaker.freePerDay" :min="0" :max="99" />
          <span class="unit">次/天</span>
        </el-form-item>
        <el-form-item label="会员每日次数">
          <el-input-number v-model="form.matchmaker.vipPerDay" :min="0" :max="999" />
          <span class="unit">次/天</span>
        </el-form-item>

        <!-- AI 个人印象 -->
        <el-divider content-position="left">AI 个人印象</el-divider>
        <el-form-item label="非会员每周次数">
          <el-input-number v-model="form.impression.freePerWeek" :min="0" :max="99" />
          <span class="unit">次/周</span>
          <div class="form-tip">非会员每周可生成/刷新个人印象的次数</div>
        </el-form-item>
        <el-form-item label="会员每日次数">
          <el-input-number v-model="form.impression.vipPerDay" :min="0" :max="99" />
          <span class="unit">次/天</span>
        </el-form-item>

        <!-- AI 情感问答 -->
        <el-divider content-position="left">AI 情感问答（AI帮回）</el-divider>
        <el-form-item label="非会员每日次数">
          <el-input-number v-model="form.emotion.freePerDay" :min="0" :max="99" />
          <span class="unit">次/天</span>
        </el-form-item>
        <el-form-item label="会员每日次数">
          <el-input-number v-model="form.emotion.vipPerDay" :min="0" :max="999" />
          <span class="unit">次/天</span>
        </el-form-item>

        <!-- AI 缘分匹配 -->
        <el-divider content-position="left">AI 缘分匹配</el-divider>
        <el-form-item label="非会员每日次数">
          <el-input-number v-model="form.match.freePerDay" :min="0" :max="99" />
          <span class="unit">次/天</span>
        </el-form-item>
        <el-form-item label="会员每日次数">
          <el-input-number v-model="form.match.vipPerDay" :min="0" :max="999" />
          <span class="unit">次/天</span>
        </el-form-item>

        <!-- AI 趣味测试 -->
        <el-divider content-position="left">AI 趣味测试</el-divider>
        <el-form-item label="非会员每日次数">
          <el-input-number v-model="form.quiz.freePerDay" :min="0" :max="99" />
          <span class="unit">次/天</span>
        </el-form-item>
        <el-form-item label="会员每日次数">
          <el-input-number v-model="form.quiz.vipPerDay" :min="0" :max="999" />
          <span class="unit">次/天</span>
        </el-form-item>

      </el-form>
    </el-card>

    <div class="config-footer">
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存配置
      </el-button>
      <el-button @click="fetchConfig">重置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminSystem } from '../../api'

const saving = ref(false)

const form = reactive({
  chat:        { freePerMatch: 2,  vipPerDay: 10 },
  matchmaker:  { freePerDay: 3,   vipPerDay: 10 },
  impression:  { freePerWeek: 1,  vipPerDay: 1 },
  emotion:     { freePerDay: 3,   vipPerDay: 10 },
  match:       { freePerDay: 2,   vipPerDay: 10 },
  quiz:        { freePerDay: 2,   vipPerDay: 10 },
})

onMounted(async () => {
  await fetchConfig()
})

async function fetchConfig() {
  try {
    const res = await adminSystem.getQuotaConfig()
    if (res.success && res.data) {
      Object.assign(form, res.data)
    }
  } catch (error) {
    console.error('获取配额配置失败:', error)
  }
}

async function handleSave() {
  saving.value = true
  try {
    const res = await adminSystem.saveQuotaConfig({ ...form })
    if (res.success) {
      ElMessage.success('配额配置保存成功')
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
.quota-config {
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
    max-width: 700px;
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
    color: #409eff;
    font-weight: 600;
  }
}
</style>
