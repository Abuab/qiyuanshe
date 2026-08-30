<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="设置VIP"
    width="480px"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="用户">{{ nickname }}</el-form-item>
      <el-form-item label="选择套餐">
        <el-select v-model="form.packageId" placeholder="选择已有套餐" style="width: 100%" clearable @change="onPackageChange">
          <el-option
            v-for="pkg in vipPackageList"
            :key="pkg.id"
            :label="`${pkg.name} (¥${pkg.price}/${pkg.durationDays}天)`"
            :value="pkg.id"
          />
        </el-select>
        <div class="form-tip">选择套餐后自动填充等级和有效期</div>
      </el-form-item>
      <el-form-item label="VIP等级" required>
        <el-select v-model="form.level" style="width: 200px" :disabled="!!form.packageId">
          <el-option label="普通用户" :value="0" />
          <el-option label="会员" :value="1" />
        </el-select>
        <div v-if="form.packageId" class="form-tip">已选择套餐，等级自动锁定为会员</div>
      </el-form-item>
      <el-form-item label="有效期">
        <el-input-number v-model="form.days" :min="1" :max="3650" />
        <span class="ml-10">天</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="$emit('submit', { ...form })">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { vipPackages, type VipPackage } from '../../../api/vip'

const props = defineProps<{
  modelValue: boolean
  nickname: string
  currentLevel?: number
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { level: number; days: number; packageId: number | null; packageName: string }]
}>()

const form = reactive({
  level: props.currentLevel ?? 0,
  days: 30,
  packageId: null as number | null,
  packageName: '',
})

const vipPackageList = ref<VipPackage[]>([])

async function fetchPackages() {
  try {
    const res = await vipPackages.list(1, 100)
    if (res.success && res.data) {
      vipPackageList.value = res.data.list || []
    }
  } catch { /* ignore */ }
}

function onPackageChange(packageId: number | null) {
  if (!packageId) {
    form.packageName = ''
    return
  }
  const pkg = vipPackageList.value.find(p => p.id === packageId)
  if (pkg) {
    form.level = 1
    form.days = pkg.durationDays
    form.packageName = pkg.name
  }
}

watch(() => props.currentLevel, (val) => {
  form.level = val ?? 0
})

watch(() => props.modelValue, (val) => {
  if (val) {
    form.level = props.currentLevel ?? 0
    form.days = 30
    form.packageId = null
    form.packageName = ''
    fetchPackages()
  }
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
</style>
