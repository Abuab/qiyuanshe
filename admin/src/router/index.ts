import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAdminStore } from '../store/admin'

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
        path: '/system/dict',
        name: 'SystemDict',
        component: () => import('../views/system/dict.vue'),
        meta: { title: '数据字典', requiresAuth: true },
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

  document.title = `${to.meta.title || '管理后台'} - 栖缘社`
  next()
})

export default router
