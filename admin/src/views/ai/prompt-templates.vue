<template>
  <div class="ai-prompt-page">
    <div class="page-header">
      <h2 class="page-title">AI Prompt 配置</h2>
      <p class="page-desc">
        配置「AI 性格深度解读」「AI 红娘匹配建议」「AI 分享文案」的 Prompt 模板。
        支持插入变量（点击变量标签复制），保存后即时生效（约 30 秒内全量刷新）。
      </p>
    </div>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="tip-alert"
      title="合规提醒"
      description="模板中严禁引导模型输出「算命 / 运势 / 命理 / 命中注定」等封建迷信或绝对化词汇；系统已在调用时自动注入合规约束并对结果二次校验，命中禁用词将自动降级为预设通用文案。"
    />

    <div v-loading="loading">
      <el-card
        v-for="item in templates"
        :key="item.key"
        class="tpl-card"
        shadow="never"
      >
        <template #header>
          <div class="card-header">
            <span class="card-title">{{ item.label }}</span>
            <span class="card-key">{{ item.key }}</span>
          </div>
        </template>

        <div class="var-row">
          <span class="var-label">可用变量：</span>
          <el-tag
            v-for="v in item.variables"
            :key="v"
            class="var-tag"
            size="small"
            effect="plain"
            @click="copyVar(v)"
          >
            {{ v }}
          </el-tag>
        </div>

        <el-input
          v-model="item.value"
          type="textarea"
          :rows="10"
          placeholder="留空则使用系统默认模板"
          resize="vertical"
        />

        <div class="card-footer">
          <el-button link type="info" @click="resetToDefault(item)">
            恢复默认
          </el-button>
        </div>
      </el-card>
    </div>

    <div class="save-bar">
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存全部
      </el-button>
      <el-button @click="load">重新加载</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aiPromptTemplateApi, type PromptTemplateItem } from '../../api/ai'

const loading = ref(false)
const saving = ref(false)
const templates = ref<PromptTemplateItem[]>([])

async function load() {
  loading.value = true
  try {
    const res = await aiPromptTemplateApi.getAll()
    templates.value = (res.data || []).map((t) => ({ ...t }))
  } catch (e) {
    ElMessage.error('加载模板失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await aiPromptTemplateApi.save(
      templates.value.map((t) => ({ key: t.key, value: t.value })),
    )
    ElMessage.success('保存成功，约 30 秒内全量生效')
    await load()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function resetToDefault(item: PromptTemplateItem) {
  item.value = item.defaultValue
}

async function copyVar(v: string) {
  try {
    await navigator.clipboard.writeText(v)
    ElMessage.success(`已复制 ${v}`)
  } catch {
    ElMessage.info(v)
  }
}

onMounted(load)
</script>

<style scoped>
.ai-prompt-page {
  padding: 4px;
}
.page-header {
  margin-bottom: 16px;
}
.page-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
}
.page-desc {
  margin: 0;
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}
.tip-alert {
  margin-bottom: 16px;
}
.tpl-card {
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.card-title {
  font-weight: 600;
}
.card-key {
  font-size: 12px;
  color: #c0c4cc;
}
.var-row {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.var-label {
  font-size: 13px;
  color: #606266;
}
.var-tag {
  cursor: pointer;
}
.card-footer {
  margin-top: 8px;
  text-align: right;
}
.save-bar {
  position: sticky;
  bottom: 0;
  padding: 12px 0;
  background: #fff;
  border-top: 1px solid #ebeef5;
}
</style>
