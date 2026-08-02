<template>
  <div class="stats-card" :style="{ borderLeftColor: color }" :class="{ 'stats-card--alert': alert }">
    <div class="card-header">
      <span class="card-title">{{ title }}</span>
      <el-icon class="card-icon" :style="{ color }">
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="card-body">
      <span class="card-value">{{ displayValue }}</span>
      <span v-if="suffix" class="card-suffix">{{ suffix }}</span>
    </div>
    <div class="card-footer" v-if="change !== undefined">
      <span class="change-value" :class="changeClass">
        <el-icon v-if="change > 0"><Top /></el-icon>
        <el-icon v-else-if="change < 0"><Bottom /></el-icon>
        {{ Math.abs(change) }}%
      </span>
      <span class="change-label">较昨日</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Top, Bottom } from '@element-plus/icons-vue'

interface Props {
  title: string
  value: number | string
  suffix?: string
  icon?: string
  color?: string
  change?: number
  prefix?: string
  alert?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  suffix: '',
  icon: 'DataLine',
  color: '#409EFF',
  change: undefined,
  prefix: '',
  alert: false,
})

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.prefix + props.value.toLocaleString()
  }
  return props.prefix + props.value
})

const changeClass = computed(() => ({
  'positive': (props.change ?? 0) > 0,
  'negative': (props.change ?? 0) < 0,
  'neutral': props.change === 0,
}))
</script>

<style lang="scss" scoped>
.stats-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  &--alert {
    animation: alert-pulse 2s ease-in-out infinite;
    box-shadow: 0 2px 12px rgba(245, 108, 108, 0.2);
  }
}

@keyframes alert-pulse {
  0%, 100% { box-shadow: 0 2px 12px rgba(245, 108, 108, 0.2); }
  50% { box-shadow: 0 2px 20px rgba(245, 108, 108, 0.4); }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  color: #666;
  font-size: 14px;
}

.card-icon {
  font-size: 24px;
  opacity: 0.8;
}

.card-body {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.card-suffix {
  font-size: 14px;
  color: #999;
}

.card-footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.change-value {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;

  &.positive {
    color: #67c23a;
  }

  &.negative {
    color: #f56c6c;
  }

  &.neutral {
    color: #909399;
  }
}

.change-label {
  font-size: 12px;
  color: #999;
}
</style>
