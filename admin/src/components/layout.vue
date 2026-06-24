<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="aside">
      <sidebar />
    </el-aside>
    <el-container>
      <el-header class="header">
        <header-bar />
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdminStore } from '../store/admin'
import Sidebar from './sidebar.vue'
import HeaderBar from './header.vue'

const adminStore = useAdminStore()
const isCollapsed = computed(() => adminStore.isCollapsed)
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #1a1a2e;
  transition: width 0.3s;
  overflow-x: hidden;
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
