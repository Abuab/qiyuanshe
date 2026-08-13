<template>
  <div class="header-bar">
    <div class="header-left">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="parentTitle">{{ parentTitle }}</el-breadcrumb-item>
        <el-breadcrumb-item v-if="currentRoute.meta.title">
          {{ currentRoute.meta.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="header-center">
      <div class="global-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户 ID / 昵称 / 手机号"
          size="default"
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
          @clear="searchResults = []"
        >
          <template #prefix>
            <el-icon class="search-icon"><Search /></el-icon>
          </template>
        </el-input>
        <div v-if="searchResults.length > 0" class="search-dropdown">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="search-item"
            @click="goToUser(item.id)"
          >
            <Avatar :src="item.avatar" type="user" :size="32" />
            <div class="search-item-info">
              <span class="search-item-name">{{ item.nickname }}</span>
              <span class="search-item-id">ID: {{ item.id }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="header-right">
      <el-dropdown @command="handleCommand" trigger="click">
        <div class="user-dropdown">
          <Avatar :src="userInfo?.avatar" :type="userInfo?.role === 'matchmaker' ? 'matchmaker' : 'user'" :size="36" />
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../store/admin'
import Avatar from './Avatar.vue'
import { ArrowDown, User, Lock, SwitchButton, Search } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { adminUsers } from '../api'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const currentRoute = computed(() => route)
const userInfo = computed(() => adminStore.userInfo)

// 路由路径 → 父级菜单名（用于面包屑展示父级层级）
const MENU_PARENT_MAP: Record<string, string> = {
  '/user/list': '用户管理',
  '/user/deactivated': '用户管理',
  '/user/detail': '用户管理',
  '/system/operation-tag': '用户管理',
  '/audit/list': '审核管理',
  '/audit/queue': '审核管理',
  '/single-promise': '审核管理',
  '/education-auth': '审核管理',
  '/property-auth': '审核管理',
  '/car-auth': '审核管理',
  '/audit-log': '审核管理',
  '/matchmaker/list': '红娘管理',
  '/matchmaker/edit': '红娘管理',
  '/matchmaker-comments': '红娘管理',
  '/question/list': '问答管理',
  '/question/edit': '问答管理',
  '/question/detail': '问答管理',
  '/activity/list': '活动管理',
  '/activity/edit': '活动管理',
  '/activity/signups': '活动管理',
  '/payment/list': '订单管理',
  '/payment/stats': '订单管理',
  '/vip/packages': '会员管理',
  '/personality/questions': '人格测试',
  '/personality/types': '人格测试',
  '/personality/dimensions': '人格测试',
  '/personality/stats': '人格测试',
  '/guide/floating-button': '引导文案',
  '/guide/copy': '引导文案',
  '/system/ai-switch': 'AI 管理',
  '/ai/safety-audit': 'AI 管理',
  '/ai/provider': 'AI 管理',
  '/ai/call-logs': 'AI 管理',
  '/ai/quick-questions': 'AI 管理',
  '/ai/prompt-templates': 'AI 管理',
  '/system/quota': 'AI 管理',
  '/store-cert-mgmt': '到店认证',
  '/system/store-cert': '到店认证',
  '/system/config': '系统配置',
  '/system/official-account': '系统配置',
  '/agreement': '系统配置',
  '/agreement-log-storage': '系统配置',
  '/system/dict': '系统配置',
  '/system/notification-channel': '系统配置',
  '/system/notification-log': '系统配置',
}

const parentTitle = computed(() => {
  const path = route.path
  for (const [prefix, title] of Object.entries(MENU_PARENT_MAP)) {
    if (path === prefix || path.startsWith(prefix + '/')) return title
  }
  return ''
})

const searchKeyword = ref('')
const searchResults = ref<any[]>([])

async function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    searchResults.value = []
    return
  }

  try {
    const res: any = await adminUsers.list({ keyword: kw, page: 1, limit: 5 })
    searchResults.value = res?.list || []
  } catch {
    searchResults.value = []
  }
}

function goToUser(id: number) {
  searchKeyword.value = ''
  searchResults.value = []
  router.push({ name: 'UserDetail', params: { id } })
}

function handleCommand(command: string) {
  searchResults.value = []
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
  router.push({ name: 'AdminProfile' })
  ElMessage.info('请在个人中心页面修改密码')
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

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 400px;
  margin: 0 24px;
}

.global-search {
  position: relative;
  width: 100%;

  .search-input {
    :deep(.el-input__wrapper) {
      border-radius: 20px;
      background: #f5f7fa;
      border: 1px solid transparent;
      transition: all 0.3s;

      &.is-focus {
        background: #fff;
        border-color: var(--el-color-primary);
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
      }
    }
  }
}

.search-icon {
  color: #a0aec0;
}

.search-dropdown {
  position: absolute;
  top: 42px;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f7fa;
  }

  & + & {
    border-top: 1px solid #f0f0f0;
  }
}

.search-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-item-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.search-item-id {
  font-size: 12px;
  color: #999;
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
