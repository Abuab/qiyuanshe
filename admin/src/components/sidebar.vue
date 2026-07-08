<template>
  <div class="sidebar">
    <div class="logo-area" :class="{ collapsed: isCollapsed }">
      <span v-if="!isCollapsed" class="logo-text">{{ appName }}</span>
      <span v-else class="logo-text-short">{{ appNameShort }}</span>
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
        <el-menu-item index="/user/deactivated">已注销用户</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="isSuperAdmin" index="/matchmaker">
        <template #title>
          <el-icon><UserFilled /></el-icon>
          <span>红娘管理</span>
        </template>
        <el-menu-item index="/matchmaker/list">红娘列表</el-menu-item>
        <el-menu-item index="/matchmaker-comments">红娘评语</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="canManageQuestion" index="/question">
        <template #title>
          <el-icon><QuestionFilled /></el-icon>
          <span>问答管理</span>
        </template>
        <el-menu-item index="/question/list">问答列表</el-menu-item>
      </el-sub-menu>

      <el-menu-item
        v-if="userInfo?.role === 'super_admin'"
        index="/admin-user"
      >
        <el-icon><AvatarIcon /></el-icon>
        <template #title>子账号管理</template>
      </el-menu-item>

      <el-sub-menu v-if="canManageAudit" index="/audit">
        <template #title>
          <el-icon><CircleCheck /></el-icon>
          <span>审核管理</span>
          <el-badge v-if="adminStore.pendingAuditCount > 0" :value="adminStore.pendingAuditCount" class="menu-badge" />
        </template>
        <el-menu-item index="/audit/list">审核列表</el-menu-item>
        <el-menu-item index="/audit/queue">人工审核队列</el-menu-item>
        <el-menu-item index="/single-promise">单身承诺审核</el-menu-item>
        <el-menu-item index="/education-auth">学历认证审核</el-menu-item>
      </el-sub-menu>

      <el-menu-item v-if="canManageAudit" index="/chat/monitor">
        <el-icon><ChatDotRound /></el-icon>
        <template #title>聊天监控</template>
      </el-menu-item>

      <el-menu-item v-if="isSuperAdmin" index="/report">
        <el-icon><Warning /></el-icon>
        <template #title>举报管理</template>
      </el-menu-item>

      <el-menu-item v-if="isSuperAdmin" index="/feedback">
        <el-icon><ChatLineSquare /></el-icon>
        <template #title>问题反馈</template>
      </el-menu-item>

      <el-menu-item v-if="isSuperAdmin || userInfo?.role === 'matchmaker'" index="/matchmaker-dynamics">
        <el-icon><Promotion /></el-icon>
        <template #title>红娘发布动态</template>
      </el-menu-item>

      <el-menu-item v-if="isSuperAdmin" index="/circles">
        <el-icon><Connection /></el-icon>
        <template #title>圈子管理</template>
      </el-menu-item>

      <el-menu-item v-if="isSuperAdmin" index="/circle-posts">
        <el-icon><Document /></el-icon>
        <template #title>
          <span>帖子审核</span>
          <el-badge v-if="adminStore.pendingPostCount > 0" :value="adminStore.pendingPostCount" class="menu-badge" />
        </template>
      </el-menu-item>

      <el-menu-item v-if="isSuperAdmin" index="/success-cases">
        <el-icon><Star /></el-icon>
        <template #title>成功案例</template>
      </el-menu-item>

      <el-sub-menu v-if="canManagePayment" index="/payment">
        <template #title>
          <el-icon><Tickets /></el-icon>
          <span>订单管理</span>
        </template>
        <el-menu-item index="/payment/list">订单列表</el-menu-item>
        <el-menu-item index="/payment/stats">营收统计</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="isSuperAdmin" index="/vip">
        <template #title>
          <el-icon><Ticket /></el-icon>
          <span>会员管理</span>
        </template>
        <el-menu-item index="/vip/packages">套餐管理</el-menu-item>
        <el-menu-item index="/vip/page-config">页面配置</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="canManageActivity" index="/activity">
        <template #title>
          <el-icon><Calendar /></el-icon>
          <span>活动管理</span>
        </template>
        <el-menu-item index="/activity/list">活动列表</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="canManagePersonality" index="/personality">
        <template #title>
          <el-icon><Compass /></el-icon>
          <span>人格测试</span>
        </template>
        <el-menu-item index="/personality/questions">题目管理</el-menu-item>
        <el-menu-item index="/personality/types">人格类型定义</el-menu-item>
        <el-menu-item index="/personality/dimensions">维度管理</el-menu-item>
        <el-menu-item index="/personality/stats">测试数据统计</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="canManageGuide" index="/guide">
        <template #title>
          <el-icon><MagicStick /></el-icon>
          <span>引导文案</span>
        </template>
        <el-menu-item index="/guide/floating-button">首页浮动按钮</el-menu-item>
        <el-menu-item index="/guide/copy">文案配置</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="isSuperAdmin" index="/system">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>系统配置</span>
        </template>
        <el-menu-item index="/system/config">基础配置</el-menu-item>
        <el-menu-item index="/notice/list">公告管理</el-menu-item>
        <el-menu-item index="/agreement">协议管理</el-menu-item>
        <el-menu-item index="/agreement-log-storage">同意记录存储配置</el-menu-item>
        <el-menu-item index="/system/dict">选项配置</el-menu-item>
        <el-menu-item index="/system/ai-switch">AI功能开关</el-menu-item>
        <el-menu-item index="/ai/safety-audit">内容安全审核</el-menu-item>
        <el-menu-item index="/ai/provider">AI Provider管理</el-menu-item>
        <el-menu-item index="/ai/call-logs">AI调用日志</el-menu-item>
        <el-menu-item index="/ai/quick-questions">快捷问题管理</el-menu-item>
        <el-menu-item index="/ai/prompt-templates">AI Prompt配置</el-menu-item>
        <el-menu-item index="/system/quota">用量限额</el-menu-item>
        <el-menu-item index="/system/notification-channel">通知通道</el-menu-item>
        <el-menu-item index="/system/notification-log">通知日志</el-menu-item>
      </el-sub-menu>
    </el-menu>

    <div class="sidebar-footer">
      <div class="admin-info" v-if="!isCollapsed">
        <Avatar :src="userInfo?.avatar" :type="userInfo?.role === 'matchmaker' ? 'matchmaker' : 'user'" :size="36" />
        <div class="info-text">
          <div class="nickname">{{ userInfo?.nickname || '管理员' }}</div>
          <div class="role">{{ getRoleLabel(userInfo?.role) }}</div>
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
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../store/admin'
import { useSystemStore } from '../store/system'
import Avatar from './Avatar.vue'
import {
  DataAnalysis,
  User,
  UserFilled,
  QuestionFilled,
  CircleCheck,
  Tickets,
  Setting,
  Calendar,
  Warning,
  Avatar as AvatarIcon,
  Connection,
  Document,
  Star,
  ChatDotRound,
  Promotion,
  Ticket,
  ChatLineSquare,
  Compass,
  MagicStick,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const systemStore = useSystemStore()

const appName = computed(() => systemStore.appName)
const appNameShort = computed(() => systemStore.appName.charAt(0))

const isCollapsed = computed(() => adminStore.isCollapsed)
const userInfo = computed(() => adminStore.userInfo)

onMounted(() => {
  systemStore.fetchSystemConfig()
  adminStore.fetchPendingAuditCount()
  // 每 60 秒轮询一次审核计数
  pendingCountTimer = setInterval(() => adminStore.fetchPendingAuditCount(), 60000)
})

onUnmounted(() => {
  if (pendingCountTimer) {
    clearInterval(pendingCountTimer)
    pendingCountTimer = null
  }
})
const activeMenu = computed(() => route.path)

const isSuperAdmin = computed(() => userInfo.value?.role === 'super_admin')
const canManageAudit = computed(() => isSuperAdmin.value || userInfo.value?.role === 'operator')
const canManagePayment = computed(() => isSuperAdmin.value || userInfo.value?.role === 'operator')
const canManageQuestion = computed(() => isSuperAdmin.value || userInfo.value?.role === 'matchmaker' || userInfo.value?.role === 'operator' || userInfo.value?.role === 'readonly')
const canManageActivity = computed(() => isSuperAdmin.value || userInfo.value?.role === 'matchmaker' || userInfo.value?.role === 'operator' || userInfo.value?.role === 'readonly')
// 人格测试配置：仅超级管理员与红娘可访问
const canManagePersonality = computed(() => isSuperAdmin.value || userInfo.value?.role === 'matchmaker')
const canManageGuide = computed(() => isSuperAdmin.value || userInfo.value?.role === 'operator')

// 待审核计数轮询
let pendingCountTimer: ReturnType<typeof setInterval> | null = null

function getRoleLabel(role?: string) {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    matchmaker: '红娘',
    operator: '运营',
    readonly: '只读',
    admin: '超级管理员',
  }
  return map[role || ''] || '管理员'
}

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

.menu-badge {
  margin-left: 8px;
  display: inline-flex;
  align-items: center;

  :deep(.el-badge__content) {
    background-color: #F56C6C;
  }
}
</style>
