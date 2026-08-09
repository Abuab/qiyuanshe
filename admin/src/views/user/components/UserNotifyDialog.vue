<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="发送通知"
    width="500px"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="用户">{{ nickname }}</el-form-item>
      <el-form-item label="通知标题">
        <el-input v-model="form.title" placeholder="可选" />
      </el-form-item>
      <el-form-item label="通知内容" required>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="4"
          placeholder="请输入通知内容..."
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="$emit('submit', { ...form })">发送</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  nickname: string
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { title: string; content: string }]
}>()

const form = reactive({ title: '', content: '' })

watch(() => props.modelValue, (val) => {
  if (val) {
    form.title = ''
    form.content = ''
  }
})
</script>
