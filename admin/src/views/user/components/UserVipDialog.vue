<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="调整VIP等级"
    width="400px"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="用户">{{ nickname }}</el-form-item>
      <el-form-item label="VIP等级" required>
        <el-select v-model="form.level" style="width:200px">
          <el-option label="普通用户" :value="0" />
          <el-option label="会员" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="有效期">
        <el-input-number v-model="form.days" :min="1" :max="3650" />
        <span class="ml-12">天</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="$emit('submit', { ...form })">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  nickname: string
  currentLevel?: number
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { level: number; days: number }]
}>()

const form = reactive({ level: props.currentLevel ?? 0, days: 30 })

watch(() => props.currentLevel, (val) => {
  form.level = val ?? 0
})

watch(() => props.modelValue, (val) => {
  if (val) {
    form.level = props.currentLevel ?? 0
    form.days = 30
  }
})
</script>
