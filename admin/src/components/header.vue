<template>
  <div class="header-bar">
    <div class="header-left">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="currentRoute.meta.title">
          {{ currentRoute.meta.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="header-right">
      <el-dropdown @command="handleCommand" trigger="click">
        <div class="user-dropdown">
          <el-avatar :size="36" :src="userInfo?.avatar" />
          <span class="username">{{ userInfo?.nickname || '管理员' }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              个人中心
            </el-dropdown-item>
            <el-dropdown-item command="password">
              <el-icon><Lock /></el-icon>
              修改密码
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../store/admin'
import { ArrowDown, User, Lock, SwitchButton } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const currentRoute = computed(() => route)
const userInfo = computed(() => adminStore.userInfo)

function handleCommand(command: string) {
  switch (command) {
    case 'profile':
      router.push({ name: 'AdminProfile' })
      break
    case 'password':
      showPasswordDialog()
      break
    case 'logout':
      handleLogout()
      break
  }
}

function showPasswordDialog() {
  ElMessageBox.prompt('请输入新密码', '修改密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'password',
  })
    .then(({ value }) => {
      console.log('New password:', value)
    })
    .catch(() => {})
}

function handleLogout() {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      adminStore.logout()
    })
    .catch(() => {})
}
</script>

<style lang="scss" scoped>
.header-bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f5f7fa;
  }

  .username {
    color: #333;
    font-size: 14px;
  }
}
</style>
