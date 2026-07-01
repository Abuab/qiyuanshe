/**
 * 图标配置中心
 * 集中管理所有图标路径，便于全局替换和主题切换
 */
export const icons = {
  tabbar: {
    home: {
      default: '/static/tabbar/home.png',
      active: '/static/tabbar/home-active.png',
    },
    dynamic: {
      default: '/static/tabbar/moment.png',
      active: '/static/tabbar/moment-active.png',
    },
    vip: {
      default: '/static/tabbar/vip.png',
      active: '/static/tabbar/vip-active.png',
    },
    message: {
      default: '/static/tabbar/message.png',
      active: '/static/tabbar/message-active.png',
    },
    my: {
      default: '/static/tabbar/mine.png',
      active: '/static/tabbar/mine-active.png',
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
