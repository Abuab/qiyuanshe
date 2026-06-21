<template>
  <view class="daily-countdown">{{ remaining }}</view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  targetTime: string
}>()

const remaining = ref('00:00:00')
let timer: ReturnType<typeof setInterval> | null = null

function updateCountdown() {
  const target = new Date(props.targetTime).getTime()
  const now = Date.now()
  const diff = Math.max(0, target - now)

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  const pad = (n: number) => n.toString().padStart(2, '0')
  remaining.value = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

onMounted(() => {
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style lang="scss" scoped>
.daily-countdown {
  font-size: 24rpx;
  color: #ffffff;
  font-family: monospace;
}
</style>
