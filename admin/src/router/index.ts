import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAdminStore } from '../store/admin'
import { useSystemStore } from '../store/system'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('../components/layout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: '/chat/monitor',
        name: 'ChatMonitor',
        component: () => import('../views/chat/monitor.vue'),
        meta: { title: '聊天监控', requiresAuth: true },
      },
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard.vue'),
        meta: { title: '数据看板', requiresAuth: true },
      },
      {
        path: '/user/list',
        name: 'UserList',
        component: () => import('../views/user/list.vue'),
        meta: { title: '用户列表', requiresAuth: true },
      },
      {
        path: '/user/detail/:id',
        name: 'UserDetail',
        component: () => import('../views/user/detail.vue'),
        meta: { title: '用户详情', requiresAuth: true },
      },
      {
        path: '/user/deactivated',
        name: 'UserDeactivated',
        component: () => import('../views/user/deactivated.vue'),
        meta: { title: '已注销用户', requiresAuth: true },
      },
      {
        path: '/matchmaker/list',
        name: 'MatchmakerList',
        component: () => import('../views/matchmaker/list.vue'),
        meta: { title: '红娘列表', requiresAuth: true },
      },
      {
        path: '/matchmaker/edit/:id?',
        name: 'MatchmakerEdit',
        component: () => import('../views/matchmaker/edit.vue'),
        meta: { title: '红娘编辑', requiresAuth: true },
      },
      {
        path: '/question/list',
        name: 'QuestionList',
        component: () => import('../views/question/list.vue'),
        meta: { title: '问答列表', requiresAuth: true },
      },
      {
        path: '/question/edit/:id?',
        name: 'QuestionEdit',
        component: () => import('../views/question/edit.vue'),
        meta: { title: '问答编辑', requiresAuth: true },
      },
      {
        path: '/question/detail/:id',
        name: 'QuestionDetail',
        component: () => import('../views/question/detail.vue'),
        meta: { title: '问答详情', requiresAuth: true },
      },
      {
        path: '/audit/list',
        name: 'AuditList',
        component: () => import('../views/audit/list.vue'),
        meta: { title: '审核管理', requiresAuth: true },
      },
      {
        path: '/payment/list',
        name: 'PaymentList',
        component: () => import('../views/payment/list.vue'),
        meta: { title: '订单列表', requiresAuth: true },
      },
      {
        path: '/payment/stats',
        name: 'PaymentStats',
        component: () => import('../views/payment/stats.vue'),
        meta: { title: '营收统计', requiresAuth: true },
      },
      {
        path: '/system/config',
        name: 'SystemConfig',
        component: () => import('../views/system/config.vue'),
        meta: { title: '系统配置', requiresAuth: true },
      },
      {
        path: '/system/store-cert',
        name: 'StoreCertConfig',
        component: () => import('../views/system/store-cert.vue'),
        meta: { title: '到店认证门店配置', requiresAuth: true },
      },
      {
        path: '/store-cert-mgmt',
        name: 'StoreCertMgmt',
        component: () => import('../views/store-cert/index.vue'),
        meta: { title: '到店认证管理', requiresAuth: true },
      },
      {
        path: '/system/notification-channel',
        name: 'NotificationChannel',
        component: () => import('../views/system/notification-channel.vue'),
        meta: { title: '通知通道', requiresAuth: true },
      },
      {
        path: '/system/notification-log',
        name: 'NotificationLog',
        component: () => import('../views/system/notification-log.vue'),
        meta: { title: '通知日志', requiresAuth: true },
      },
      {
        path: '/audit/queue',
        name: 'AuditQueue',
        component: () => import('../views/audit/queue.vue'),
        meta: { title: '人工审核队列', requiresAuth: true },
      },
      {
        path: '/agreement',
        name: 'AgreementEdit',
        component: () => import('../views/agreement/edit.vue'),
        meta: { title: '协议管理', requiresAuth: true },
      },
      {
        path: '/agreement-log-storage',
        name: 'AgreementLogStorage',
        component: () => import('../views/agreement-log-storage/index.vue'),
        meta: { title: '协议同意记录存储配置', requiresAuth: true },
      },
      {
        path: '/system/dict',
        name: 'DictConfig',
        component: () => import('../views/system/dict.vue'),
        meta: { title: '选项配置', requiresAuth: true },
      },
      {
        path: '/system/ai-switch',
        name: 'AiSwitch',
        component: () => import('../views/ai/switch.vue'),
        meta: { title: 'AI功能开关', requiresAuth: true },
      },
      {
        path: '/ai/safety-audit',
        name: 'AiSafetyAudit',
        component: () => import('../views/ai/safety-audit.vue'),
        meta: { title: '内容安全审核', requiresAuth: true },
      },
      {
        path: '/ai/provider',
        name: 'AiProvider',
        component: () => import('../views/ai/provider/index.vue'),
        meta: { title: 'AI Provider管理', requiresAuth: true },
      },
      {
        path: '/ai/call-logs',
        name: 'AiCallLogs',
        component: () => import('../views/ai/provider/call-logs.vue'),
        meta: { title: 'AI调用日志', requiresAuth: true },
      },
      {
        path: '/ai/quick-questions',
        name: 'AiQuickQuestions',
        component: () => import('../views/ai/quick-questions.vue'),
        meta: { title: '快捷问题管理', requiresAuth: true },
      },
      {
        path: '/ai/prompt-templates',
        name: 'AiPromptTemplates',
        component: () => import('../views/ai/prompt-templates.vue'),
        meta: { title: 'AI Prompt配置', requiresAuth: true },
      },
      {
        path: '/system/quota',
        name: 'SystemQuota',
        component: () => import('../views/system/quota.vue'),
        meta: { title: '用量限额', requiresAuth: true },
      },
      {
        path: '/activity/list',
        name: 'ActivityList',
        component: () => import('../views/activity/list.vue'),
        meta: { title: '活动列表', requiresAuth: true },
      },
      {
        path: '/activity/edit/:id?',
        name: 'ActivityEdit',
        component: () => import('../views/activity/edit.vue'),
        meta: { title: '活动编辑', requiresAuth: true },
      },
      {
        path: '/activity/signups/:id',
        name: 'ActivitySignups',
        component: () => import('../views/activity/signups.vue'),
        meta: { title: '报名管理', requiresAuth: true },
      },
      {
        path: '/profile',
        name: 'AdminProfile',
        component: () => import('../views/profile/index.vue'),
        meta: { title: '个人中心', requiresAuth: true },
      },
      {
        path: '/notification/broadcast',
        name: 'NotificationBroadcast',
        component: () => import('../views/notification/broadcast.vue'),
        meta: { title: '群发消息', requiresAuth: true },
      },
      {
        path: '/admin-user',
        name: 'AdminUserList',
        component: () => import('../views/admin-user/index.vue'),
        meta: { title: '子账号管理', requiresAuth: true },
      },
      {
        path: '/report',
        name: 'ReportList',
        component: () => import('../views/report/index.vue'),
        meta: { title: '举报管理', requiresAuth: true },
      },
      {
        path: '/matchmaker-comments',
        name: 'MatchmakerCommentList',
        component: () => import('../views/matchmaker-comments/index.vue'),
        meta: { title: '红娘评语', requiresAuth: true },
      },
      {
        path: '/circles',
        name: 'CircleList',
        component: () => import('../views/circles/index.vue'),
        meta: { title: '圈子管理', requiresAuth: true },
      },
      {
        path: '/success-cases',
        name: 'SuccessCaseList',
        component: () => import('../views/success-cases/index.vue'),
        meta: { title: '成功案例', requiresAuth: true },
      },
      {
        path: '/vip/packages',
        name: 'VipPackages',
        component: () => import('../views/vip/packages.vue'),
        meta: { title: '套餐管理', requiresAuth: true },
      },
      {
        path: '/feedback',
        name: 'FeedbackList',
        component: () => import('../views/feedback/index.vue'),
        meta: { title: '问题反馈', requiresAuth: true },
      },
      {
        path: '/single-promise',
        name: 'SinglePromiseList',
        component: () => import('../views/single-promise/index.vue'),
        meta: { title: '单身承诺审核', requiresAuth: true },
      },
      {
        path: '/education-auth',
        name: 'EducationAuthList',
        component: () => import('../views/education-auth/index.vue'),
        meta: { title: '学历认证审核', requiresAuth: true },
      },
      {
        path: '/property-auth',
        name: 'PropertyAuthList',
        component: () => import('../views/property-auth/index.vue'),
        meta: { title: '房产认证审核', requiresAuth: true },
      },
      {
        path: '/car-auth',
        name: 'CarAuthList',
        component: () => import('../views/car-auth/index.vue'),
        meta: { title: '车产认证审核', requiresAuth: true },
      },
      {
        path: '/personality/questions',
        name: 'PersonalityQuestions',
        component: () => import('../views/personality/questions.vue'),
        meta: { title: '题目管理', requiresAuth: true },
      },
      {
        path: '/personality/types',
        name: 'PersonalityTypes',
        component: () => import('../views/personality/types.vue'),
        meta: { title: '人格类型定义', requiresAuth: true },
      },
      {
        path: '/personality/dimensions',
        name: 'PersonalityDimensions',
        component: () => import('../views/personality/dimensions.vue'),
        meta: { title: '维度管理', requiresAuth: true },
      },
      {
        path: '/personality/stats',
        name: 'PersonalityStats',
        component: () => import('../views/personality/stats.vue'),
        meta: { title: '测试数据统计', requiresAuth: true },
      },
      {
        path: '/guide/floating-button',
        name: 'GuideFloatingButton',
        component: () => import('../views/guide/floating-button.vue'),
        meta: { title: '首页浮动按钮', requiresAuth: true },
      },
      {
        path: '/guide/copy',
        name: 'GuideCopySlots',
        component: () => import('../views/guide/copy-slots.vue'),
        meta: { title: '文案配置', requiresAuth: true },
      },
      {
        path: '/guide/copy/:slotId',
        name: 'GuideCopyDetail',
        component: () => import('../views/guide/copy-detail.vue'),
        meta: { title: '文案详情', requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const adminStore = useAdminStore()

  if (to.meta.requiresAuth !== false && !adminStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.name === 'Login' && adminStore.isLoggedIn) {
    next({ name: 'Dashboard' })
    return
  }

  const systemStore = useSystemStore()
  systemStore.fetchSystemConfig()
  document.title = `${to.meta.title || '管理后台'} - ${systemStore.appName}`
  next()
})

export default router
