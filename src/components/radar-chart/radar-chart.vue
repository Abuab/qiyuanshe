<template>
  <canvas
    :canvas-id="canvasId"
    :id="canvasId"
    class="radar-canvas"
    :style="{ width: size + 'px', height: size + 'px' }"
  ></canvas>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick, getCurrentInstance } from 'vue'

interface Props {
  /** 五维数值（0~100） */
  values: number[]
  /** 五维名称 */
  labels: string[]
  /** 画布 id（页面内需唯一） */
  canvasId?: string
  /** 画布边长（px） */
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  canvasId: 'radar-canvas',
  size: 300,
})

const instance = getCurrentInstance()

function draw() {
  // 画布位于子组件内，必须传入组件实例，否则 createCanvasContext 会在页面作用域查找 canvas 而取不到
  const ctx: any = uni.createCanvasContext(props.canvasId, instance?.proxy)
  const size = props.size
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 50
  const n = Math.max(props.labels.length, 3)
  const step = (Math.PI * 2) / n
  const start = -Math.PI / 2

  // 背景网格（4 层同心多边形）
  ctx.setStrokeStyle('#f3dbe5')
  ctx.setLineWidth(1)
  for (let layer = 1; layer <= 4; layer++) {
    const r = (radius * layer) / 4
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = start + step * i
      const x = cx + r * Math.cos(a)
      const y = cy + r * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // 轴线
  ctx.setStrokeStyle('#f3dbe5')
  ctx.setLineWidth(1)
  for (let i = 0; i < n; i++) {
    const a = start + step * i
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a))
    ctx.stroke()
  }

  // 数据多边形
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const a = start + step * i
    const v = Math.max(0, Math.min(100, props.values[i] || 0)) / 100
    const x = cx + radius * v * Math.cos(a)
    const y = cy + radius * v * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.setFillStyle('rgba(255,107,157,0.35)')
  ctx.fill()
  ctx.setStrokeStyle('#ff6b9d')
  ctx.setLineWidth(2)
  ctx.stroke()

  // 维度标签
  ctx.setFillStyle('#999999')
  ctx.setFontSize(12)
  for (let i = 0; i < n; i++) {
    const a = start + step * i
    const cosA = Math.cos(a)
    const sinA = Math.sin(a)
    const lx = cx + (radius + 12) * cosA
    const ly = cy + (radius + 12) * sinA
    if (cosA > 0.3) ctx.setTextAlign('left')
    else if (cosA < -0.3) ctx.setTextAlign('right')
    else ctx.setTextAlign('center')
    let ty = ly + 4
    if (sinA > 0.3) ty = ly + 12
    else if (sinA < -0.3) ty = ly
    ctx.fillText(props.labels[i] || '', lx, ty)
  }
  ctx.setTextAlign('center')
  ctx.draw()
}

onMounted(() => {
  nextTick(() => draw())
})

watch(
  () => props.values,
  () => draw(),
  { deep: true },
)
</script>

<style scoped>
.radar-canvas {
  display: block;
}
</style>
