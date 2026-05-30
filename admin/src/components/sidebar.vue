<template>
  <div class="sidebar">
    <div class="logo-area" :class="{ collapsed: isCollapsed }">
      <span v-if="!isCollapsed" class="logo-text">栖缘社</span>
      <span v-else class="logo-text-short">栖</span>
    </div>

    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapsed"
      background-color="#304156"
      text-color="#bfcbd9"
      active-text-color="#FF6B9D"
      :router="true"
      class="sidebar-menu"
    >
      <el-menu-item index="/dashboard">
        <el-icon><DataAnalysis /></el-icon>
        <template #title>数据看板</template>
      </el-menu-item>

      <el-sub-menu index="/user">
        <template #title>
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </template>
        <el-menu-item index="/user/list">用户列表</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/matchmaker">
        <template #title>
          <el-icon><UserFilled /></el-icon>
          <span>红娘管理</span>
        </template>
        <el-menu-item index="/matchmaker/list">红娘列表</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/question">
        <template #title>
          <el-icon><QuestionFilled /></el-icon>
          <span>问答管理</span>
        </template>
        <el-menu-item index="/question/list">问答列表</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/audit">
        <template #title>
          <el-icon><CircleCheck /></el-icon>
          <span>审核管理</span>
        </template>
        <el-menu-item index="/audit/list">待审核列表</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/payment">
        <template #title>
          <el-icon><Tickets /></el-icon>
          <span>订单管理</span>
        </template>
        <el-menu-item index="/payment/list">订单列表</el-menu-item>
        <el-menu-item index="/payment/stats">营收统计</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/system">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>系统配置</span>
        </template>
        <el-menu-item index="/system/config">基础配置</el-menu-item>
      </el-sub-menu>
    </el-menu>

    <div class="sidebar-footer">
      <div class="admin-info" v-if="!isCollapsed">
        <el-avatar :size="32" src={userInfo?.avatar} />
        <div class="info-text">
          <div class="nickname">{{ userInfo?.nickname || '管理员' }}</div>
          <div class="role">{{ userInfo?.role === 'admin' ? '超级管理员' : '普通管理员' }}</div>
        </div>
      </div>
      <el-button
        :icon="isCollapsed ? 'Expand' : 'Fold'"
        circle
        @click="toggleSidebar"
        class="collapse-btn"
      />
      <el-button
        :icon="isCollapsed ? 'SwitchButton' : 'Close'"
        circle
        @click="handleLogout"
        class="logout-btn"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../store/admin'
import {
  DataAnalysis,
  User,
  UserFilled,
  QuestionFilled,
  CircleCheck,
  Tickets,
  Setting,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const isCollapsed = computed(() => adminStore.isCollapsed)
const userInfo = computed(() => adminStore.userInfo)
const activeMenu = computed(() => route.path)

function toggleSidebar() {
  adminStore.toggleSidebar()
}

function handleLogout() {
  adminStore.logout()
}
</script>

<style lang="scss" scoped>
.sidebar {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #304156;
}

.logo-area {
  height: 60px;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  &.collapsed {
    .logo-text {
      display: none;
    }
  }
}

.logo-text {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 2px;
}

.logo-text-short {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}

.sidebar-menu {
  flex: 1;
  border-right: none;

  &:not(.el-menu--collapse) {
    width: 220px;
  }
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #3d4a5c;
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;

  .info-text {
    overflow: hidden;

    .nickname {
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }

    .role {
      color: #8b9ab0;
      font-size: 12px;
    }
  }
}

.collapse-btn,
.logout-btn {
  background-color: transparent;
  border: none;
  color: #bfcbd9;

  &:hover {
    background-color: #3d4a5c;
    color: #fff;
  }
}
</style>
