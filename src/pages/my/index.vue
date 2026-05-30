<template>
  <view class="page">
    <view class="header">{{ pageTitle }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const pageTitle = ref('页面标题')
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding: 20px;
}

.header {
  font-size: 24px;
  font-weight: bold;
  color: var(--text);
  margin-bottom: 20px;
}
</style>
