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
        path: '/agreement',
        name: 'AgreementEdit',
        component: () => import('../views/agreement/edit.vue'),
        meta: { title: '协议管理', requiresAuth: true },
      },
      {
        path: '/system/dict',
        name: 'DictConfig',
        component: () => import('../views/system/dict.vue'),
        meta: { title: '选项配置', requiresAuth: true },
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
        path: '/notice/list',
        name: 'NoticeList',
        component: () => import('../views/notice/index.vue'),
        meta: { title: '公告管理', requiresAuth: true },
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
        path: '/circle-posts',
        name: 'CirclePostList',
        component: () => import('../views/circles/posts.vue'),
        meta: { title: '帖子审核', requiresAuth: true },
      },
      {
        path: '/success-cases',
        name: 'SuccessCaseList',
        component: () => import('../views/success-cases/index.vue'),
        meta: { title: '成功案例', requiresAuth: true },
      },
      {
        path: '/matchmaker-dynamics',
        name: 'MatchmakerDynamicList',
        component: () => import('../views/matchmaker-dynamic/index.vue'),
        meta: { title: '红娘发布动态', requiresAuth: true },
      },
      {
        path: '/vip/packages',
        name: 'VipPackages',
        component: () => import('../views/vip/packages.vue'),
        meta: { title: '套餐管理', requiresAuth: true },
      },
      {
        path: '/vip/page-config',
        name: 'VipPageConfig',
        component: () => import('../views/vip/page-config.vue'),
        meta: { title: '页面配置', requiresAuth: true },
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
