<template>
  <el-avatar
    :size="size"
    :src="effectiveSrc"
    :shape="shape"
    :fit="fit"
    :style="avatarStyle"
    @error="handleImgError"
  >
    <template v-if="showIcon">
      <el-icon :size="iconSize"><User /></el-icon>
    </template>
    <template v-else-if="showFallbackText">
      {{ isMatchmaker ? '红' : '用' }}
    </template>
  </el-avatar>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { User } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    src?: string | null
    type?: 'user' | 'matchmaker'
    size?: number
    shape?: 'circle' | 'square'
    fit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
  }>(),
  {
    src: undefined,
    type: 'user',
    size: 40,
    shape: 'circle',
    fit: 'cover',
  },
)

const isMatchmaker = computed(() => props.type === 'matchmaker')
const hasError = ref(false)

const effectiveSrc = computed(() => {
  if (!props.src || props.src === '' || hasError.value) return undefined
  return props.src
})

const showIcon = computed(() => {
  if (effectiveSrc.value) return false
  return !isMatchmaker.value
})

const showFallbackText = computed(() => {
  if (effectiveSrc.value) return false
  return isMatchmaker.value
})

const iconSize = computed(() => Math.round(props.size * 0.5))

const avatarStyle = computed(() => {
  if (effectiveSrc.value) return {}
  if (isMatchmaker.value) {
    return {
      backgroundColor: '#ff6b9d',
      color: '#fff',
      fontWeight: 'bold' as const,
      fontSize: `${Math.round(props.size * 0.45)}px`,
    }
  }
  return {
    backgroundColor: '#409eff',
    color: '#fff',
    fontWeight: 'bold' as const,
  }
})

function handleImgError() {
  if (!hasError.value) {
    hasError.value = true
  }
}
</script>
