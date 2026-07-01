<template>
  <text
    class="app-icon iconfont"
    :class="name"
    :style="iconStyle"
    @tap="emitClick"
  ></text>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  size?: string | number
  color?: string
}>(), {
  size: '32',
  color: '#333333',
})

const emit = defineEmits<{
  click: []
}>()

const iconStyle = computed(() => {
  const size = String(props.size).includes('rpx')
    ? props.size
    : `${props.size}rpx`
  return {
    fontSize: size,
    color: props.color,
  }
})

const emitClick = () => {
  emit('click')
}
</script>

<style>
@import '@/static/fonts/iconfont-base64.css';
</style>
