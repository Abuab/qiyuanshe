/**
 * 图标配置中心
 * 集中管理所有图标路径，便于全局替换和主题切换
 */
export const icons = {
  tabbar: {
    home: {
      default: '/static/tabbar/tab-home-default.png',
      active: '/static/tabbar/tab-home-active.png',
    },
    dynamic: {
      default: '/static/tabbar/tab-dynamic-default.png',
      active: '/static/tabbar/tab-dynamic-active.png',
    },
    vip: {
      default: '/static/tabbar/tab-vip-default.png',
      active: '/static/tabbar/tab-vip-active.png',
    },
    message: {
      default: '/static/tabbar/tab-message-default.png',
      active: '/static/tabbar/tab-message-active.png',
    },
    my: {
      default: '/static/tabbar/tab-my-default.png',
      active: '/static/tabbar/tab-my-active.png',
    },
  },
  quickEntry: {
    matchmakerComment: '/static/matchmaker.png',
    latestActivity: '/static/activity.png',
    datingCircle: '/static/circle.png',
    successCouple: '/static/couple.png',
  },
  common: {
    defaultAvatar: '/static/default-avatar.png',
    heart: '/static/heart.png',
  },
} as const
