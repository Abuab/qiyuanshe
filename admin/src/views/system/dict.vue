<template>
  <div class="dict-page">
    <div class="page-header">
      <h2 class="page-title">数据字典</h2>
      <el-button type="primary" @click="handleSave" :loading="saveLoading">
        <el-icon><Check /></el-icon>保存当前
      </el-button>
    </div>

    <el-row :gutter="20">
      <el-col :span="4">
        <el-menu :default-active="activeKey" @select="handleMenuSelect" class="dict-menu">
          <el-menu-item v-for="item in dictKeys" :key="item.key" :index="item.key">
            {{ item.label }}
          </el-menu-item>
        </el-menu>
      </el-col>
      <el-col :span="20">
        <el-card v-if="activeKey">
          <template #header>
            <span>{{ currentLabel }} ({{ currentOptions.length }} 项)</span>
          </template>

          <div class="tag-editor">
            <el-tag
              v-for="(opt, idx) in currentOptions"
              :key="idx"
              closable
              :disable-transitions="false"
              size="large"
              @close="handleRemoveTag(idx)"
              class="dict-tag"
            >
              {{ opt }}
            </el-tag>

            <div class="add-row">
              <el-input
                v-model="newOption"
                placeholder="输入新选项"
                size="small"
                style="width: 160px"
                @keyup.enter="handleAddTag"
              />
              <el-button size="small" @click="handleAddTag" :disabled="!newOption.trim()">添加</el-button>
            </div>

            <el-empty v-if="currentOptions.length === 0 && !newOption" description="暂无选项，请添加" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { system } from '../../api/system'

const dictKeys = [
  { key: 'education', label: '学历' },
  { key: 'occupation', label: '职业' },
  { key: 'incomeRange', label: '收入范围' },
  { key: 'maritalStatus', label: '婚况' },
  { key: 'housingStatus', label: '住房状态' },
  { key: 'carStatus', label: '车辆状态' },
]

const activeKey = ref('education')
const dictData = reactive<Record<string, string[]>>({})
const newOption = ref('')
const saveLoading = ref(false)

const currentOptions = computed(() => dictData[activeKey.value] || [])
const currentLabel = computed(() => dictKeys.find(d => d.key === activeKey.value)?.label || '')

onMounted(async () => {
  for (const item of dictKeys) {
    await loadDict(item.key)
  }
})

async function loadDict(key: string) {
  try {
    const res = await system.getDict(key)
    if (res.success) {
      dictData[key] = res.data || []
    }
  } catch {
    dictData[key] = []
  }
}

function handleMenuSelect(key: string) {
  activeKey.value = key
  newOption.value = ''
}

function handleRemoveTag(idx: number) {
  dictData[activeKey.value].splice(idx, 1)
}

function handleAddTag() {
  const val = newOption.value.trim()
  if (!val) return
  if (!dictData[activeKey.value]) {
    dictData[activeKey.value] = []
  }
  if (dictData[activeKey.value].includes(val)) {
    ElMessage.warning('该选项已存在')
    return
  }
  dictData[activeKey.value].push(val)
  newOption.value = ''
}

async function handleSave() {
  saveLoading.value = true
  try {
    const res = await system.updateDict(activeKey.value, dictData[activeKey.value] || [])
    if (res.success) {
      ElMessage.success('保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.dict-page { padding: 20px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  .page-title { font-size: 20px; font-weight: bold; margin: 0; }
}

.dict-menu { height: 100%; }

.tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-height: 80px;

  .dict-tag { margin: 0; font-size: 14px; }
}

.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
