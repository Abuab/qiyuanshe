<template>
  <el-container class="layout-container">
    <!-- 桌面端固定侧边栏 -->
    <el-aside v-if="!isMobile" :width="isCollapsed ? '64px' : '220px'" class="aside">
      <sidebar />
    </el-aside>

    <!-- 移动端抽屉侧边栏 -->
    <el-drawer
      v-if="isMobile"
      v-model="adminStore.mobileMenuOpen"
      direction="ltr"
      size="240px"
      :with-header="false"
      class="mobile-drawer"
      @close="onDrawerClose"
    >
      <sidebar />
    </el-drawer>

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
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminStore } from '../store/admin'
import { isMobile } from '../composables/useIsMobile'
import Sidebar from './sidebar.vue'
import HeaderBar from './header.vue'

const adminStore = useAdminStore()
const isCollapsed = computed(() => adminStore.isCollapsed)
const route = useRoute()

// 路由切换时自动收起移动端抽屉
function onDrawerClose() {
  adminStore.setMobileMenuOpen(false)
}

watch(
  () => route.path,
  () => adminStore.setMobileMenuOpen(false),
)
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #304156;
  transition: width 0.3s;
  overflow-x: hidden;
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.main {
  background-color: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }

  .main {
    padding: 12px;
  }
}

:global(.mobile-drawer) {
  .el-drawer__body {
    padding: 0;
  }
}
</style>

