<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="运营备注"
    width="500px"
  >
    <div v-if="loading" style="text-align:center;padding:40px 0">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
    </div>
    <div v-else-if="content" style="white-space:pre-wrap;line-height:1.8;color:#333;font-size:14px;padding:8px 0">{{ content }}</div>
    <div v-else style="text-align:center;color:#c0c4cc;font-size:13px;padding:40px 0">暂无运营备注</div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" @click="$emit('gotoDetail', userId)">进入详情编辑</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { adminUsers } from '../../../api'

const props = defineProps<{
  modelValue: boolean
  userId: number
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  gotoDetail: [userId: number]
}>()

const loading = ref(false)
const content = ref('')

watch(() => props.modelValue, async (val) => {
  if (val && props.userId) {
    loading.value = true
    content.value = ''
    try {
      const detail = await adminUsers.detail(props.userId)
      if (detail.success && detail.data) {
        content.value = (detail.data as any).adminRemark || ''
      }
    } catch {
      content.value = ''
    } finally {
      loading.value = false
    }
  }
})
</script>
