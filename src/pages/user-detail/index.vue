<template>
  <view class="user-detail-page">
    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <template v-else-if="userData">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <view class="nav-title">{{ userData.nickname || '用户' }}</view>
        <view class="nav-right">
          <text class="more-icon" @tap="showMoreActions">⋮</text>
          <text class="eye-icon" :class="{ active: userData.isFollowed }">{{ userData.isFollowed ? '👁' : '👁‍🗨' }}</text>
        </view>
      </view>

      <view class="photo-section">
        <swiper
          class="photo-swiper"
          :current="currentPhotoIndex"
          @change="onPhotoChange"
          :indicator-dots="false"
          :autoplay="false"
          :circular="false"
        >
          <swiper-item v-for="(photo, index) in userData.photos" :key="index">
            <image
              class="photo-image"
              :src="photo.url || photo"
              mode="aspectFill"
              @error="handleImageError"
              @tap="previewPhoto(index)"
            />
          </swiper-item>
        </swiper>

        <view class="share-btn" @tap="showSharePanel">
          <text class="share-icon">↗</text>
        </view>

        <view v-if="userData.photos && userData.photos.length > 1" class="photo-thumbnails">
          <view
            v-for="(photo, index) in userData.photos"
            :key="index"
            class="thumbnail-item"
            :class="{ active: currentPhotoIndex === index }"
            @tap="currentPhotoIndex = index"
          >
            <image class="thumbnail-image" :src="photo.url || photo" mode="aspectFill" @error="handleImageError" />
          </view>
        </view>
      </view>

      <view class="info-card">
        <view class="name-row">
          <view class="name-section">
            <text class="user-name">{{ userData.nickname }}</text>
            <view class="id-tag">
              <text class="id-label">ID:</text>
              <text class="id-value">{{ userData.id }}</text>
            </view>
          </view>
          <view v-if="!isSelf" class="follow-btn" @tap="toggleFollow">
            <text class="heart-icon" :class="{ filled: userData.isFollowed }">
              {{ userData.isFollowed ? '❤️' : '🤍' }}
            </text>
            <text class="follow-text">{{ userData.isFollowed ? '已关注' : '关注' }}</text>
          </view>
          <view v-else class="follow-btn edit-btn" @tap="goEditProfile">
            <text>编辑资料</text>
          </view>
        </view>

        <view class="basic-info">
          <text v-if="userData.age">{{ userData.age }}岁</text>
          <text v-if="userData.age" class="dot">·</text>
          <text v-if="userData.height">{{ userData.height }}cm</text>
          <text v-if="userData.height" class="dot">·</text>
          <text v-if="userData.weight">{{ userData.weight }}kg</text>
          <text v-if="userData.weight" class="dot">·</text>
          <text v-if="userData.education">{{ userData.education }}</text>
        </view>

        <view class="tag-row">
          <view v-if="userData.birthYear" class="tag pink-tag">
            <text class="tag-icon">🎂</text>
            <text>{{ userData.birthYear }}年·{{ userData.zodiac || '' }}·{{ userData.constellation || '' }}</text>
          </view>
          <view v-if="userData.occupation" class="tag blue-tag">
            <text class="tag-icon">💼</text>
            <text>{{ userData.occupation }}</text>
          </view>
        </view>

        <view class="address-row">
          <view v-if="userData.hometown" class="address-item">
            <text class="address-icon blue">📍</text>
            <text class="address-label">户籍</text>
            <text class="address-value">{{ userData.hometown }}</text>
          </view>
          <view v-if="userData.residence" class="address-item">
            <text class="address-icon orange">📍</text>
            <text class="address-label">现居</text>
            <text class="address-value">{{ userData.residence }}</text>
          </view>
        </view>
      </view>

      <view class="auth-section">
        <view class="section-header">
          <view class="section-title">
            <text class="shield-icon">🛡</text>
            <text>身份认证</text>
          </view>
          <text class="auth-tip">点亮的为已认证</text>
        </view>

        <scroll-view class="auth-scroll" scroll-x>
          <view class="auth-items">
            <view class="auth-item" @tap="showAuthDetail('realname')">
              <view class="auth-icon" :class="{ verified: userData.isRealName }">
                <text>{{ userData.isRealName ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">实名</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('education')">
              <view class="auth-icon" :class="{ verified: userData.education }">
                <text>{{ userData.education ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">学历</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('housing')">
              <view class="auth-icon" :class="{ verified: userData.housingStatus }">
                <text>{{ userData.housingStatus ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">房</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('car')">
              <view class="auth-icon" :class="{ verified: userData.carStatus }">
                <text>{{ userData.carStatus ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">车</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('commitment')">
              <view class="auth-icon" :class="{ verified: hasCommitment }">
                <text>{{ hasCommitment ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">单身承诺</text>
            </view>
            <view class="auth-item" @tap="showAuthDetail('marital')">
              <view class="auth-icon" :class="{ verified: userData.maritalStatus }">
                <text>{{ userData.maritalStatus ? '✓' : '—' }}</text>
              </view>
              <text class="auth-label">婚况</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="about-section">
        <view class="section-header">
          <view class="section-title">
            <text class="book-icon">📖</text>
            <text>关于我</text>
          </view>
        </view>

        <view class="tag-group">
          <view v-if="userData.incomeRange" class="info-tag">{{ userData.incomeRange }}</view>
          <view v-if="userData.housingStatus" class="info-tag">{{ userData.housingStatus }}</view>
          <view v-if="userData.carStatus" class="info-tag">{{ userData.carStatus }}</view>
          <view v-if="userData.maritalStatus" class="info-tag">{{ userData.maritalStatus }}</view>
          <view v-if="userData.isOnlyChild === 1" class="info-tag">独生子女</view>
          <view v-if="userData.marriagePlan" class="info-tag">{{ userData.marriagePlan }}</view>
        </view>

        <view v-if="userData.selfIntro" class="intro-content">
          <text class="intro-text" :class="{ collapsed: !showFullIntro }">{{ userData.selfIntro }}</text>
          <view v-if="introTooLong" class="expand-btn" @tap="showFullIntro = !showFullIntro">
            <text>{{ showFullIntro ? '收起' : '展开' }}</text>
          </view>
        </view>
      </view>

      <view v-if="userData.mateRequirement" class="requirement-section">
        <view class="section-header">
          <view class="section-title">
            <text class="heart-icon-small">💕</text>
            <text>择偶要求</text>
          </view>
        </view>

        <view class="intro-content">
          <text class="intro-text" :class="{ collapsed: !showFullRequirement }">{{ userData.mateRequirement }}</text>
          <view v-if="requirementTooLong" class="expand-btn" @tap="showFullRequirement = !showFullRequirement">
            <text>{{ showFullRequirement ? '收起' : '展开' }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-safe-area"></view>

      <view class="action-bar">
        <view class="action-btn primary-btn" @tap="handleChat">
          <text class="btn-icon">💬</text>
          <text>想认识Ta</text>
        </view>
        <view class="action-btn secondary-btn" @tap="showMatchmakerPopup">
          <text class="btn-icon">👁</text>
          <text>红娘牵线</text>
        </view>
      </view>

      <view v-if="showShare" class="share-panel">
        <view class="share-overlay" @tap="closeSharePanel"></view>
        <view class="share-content" :class="{ open: showShare }">
          <view class="share-option" @tap="shareToFriend">
            <text class="option-icon">💬</text>
            <text class="option-text">分享给好友</text>
          </view>
          <view class="share-divider"></view>
          <view class="share-option" @tap="generatePoster">
            <text class="option-icon">🖼</text>
            <text class="option-text">生成海报</text>
          </view>
        </view>
      </view>

      <matchmaker-popup
        :show="showMatchmaker"
        :matchmaker="selectedMatchmaker"
        @update:show="showMatchmaker = $event"
        @close="showMatchmaker = false"
        @more="openMatchmakerList"
      />

      <matchmaker-list-popup
        :show="showMatchmakerList"
        :matchmakers="matchmakerList"
        @update:show="showMatchmakerList = $event"
        @close="showMatchmakerList = false"
        @contact="onSelectMatchmaker"
      />

      <!-- 单身承诺签署弹窗 -->
      <view v-if="showCommitPopup" class="commit-popup">
        <view class="commit-overlay" @tap="showCommitPopup = false"></view>
        <view class="commit-card">
          <view class="commit-title">单身承诺</view>
          <text class="commit-text">本人承诺：目前在法律及事实上均为单身状态，无配偶、无恋人，自愿签署本承诺书，并对所填写信息的真实性负责。</text>
          <view class="commit-actions">
            <text class="commit-cancel" @tap="showCommitPopup = false">取消</text>
            <view class="commit-confirm" @tap="signCommitment">
              <text>同意并签署</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="empty-container">
      <text>用户不存在</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import matchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import matchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import { safeNavigateBack } from '@/utils/navigate'
import { useImageFallback } from '@/composables/useImageFallback'
const { handleImageError } = useImageFallback()

interface PhotoItem {
  id?: number
  url: string
  sortOrder?: number
}

interface UserDetailData {
  id: number
  nickname: string
  avatar: string
  gender: number
  birthYear: number
  age: number
  height: number
  weight: number
  education: string
  occupation: string
  incomeRange: string
  housingStatus: string
  carStatus: string
  maritalStatus: string
  hometown: string
  residence: string
  selfIntro: string
  mateRequirement: string
  isRealName: number
  isVip: number
  isFollowed: boolean
  isSelf: boolean
  photos: PhotoItem[]
  zodiac?: string
  constellation?: string
  isOnlyChild?: number
  marriagePlan?: string
}

const userId = ref<number>(0)
const loading = ref(true)
const userData = ref<UserDetailData | null>(null)
const currentPhotoIndex = ref(0)
const showFullIntro = ref(false)
const showFullRequirement = ref(false)
const introTooLong = ref(false)
const requirementTooLong = ref(false)
const showShare = ref(false)
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const showCommitPopup = ref(false)
const hasCommitment = ref(false)
const followLoading = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

const userStore = useUserStore()
const systemStore = useSystemStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isVip = computed(() => userStore.isVip)
/** 本地判断是否为自己，不依赖后端 isSelf 字段 */
const isSelf = computed(() => userStore.userInfo?.id != null && userStore.userInfo.id === userId.value)

onMounted(() => {
  // 激活右上角原生分享按钮（开发工具中可能不可用，加 fail 静默处理）
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
    fail: () => {
      // showShareMenu 在开发工具中 ban，静默忽略
      console.log('[分享]showShareMenu 开发工具跳过')
    },
  })

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any)?.options || {}

  if (options.id) {
    userId.value = parseInt(options.id)
    fetchUserDetail()
  } else {
    loading.value = false
  }

  fetchMatchmakerList()
})

// 从登录页返回后刷新关注状态
onShow(() => {
  if (userId.value && isLoggedIn.value && userData.value) {
    fetchFollowStatus()
  }
})

/** 单独查询关注状态（从登录页返回时刷新） */
const fetchFollowStatus = async () => {
  if (!userId.value || !isLoggedIn.value) return
  try {
    const res = await request<{ isFollowed: boolean }>({
      url: `/users/${userId.value}/follow-status`,
      method: 'GET',
    })
    if (userData.value && typeof res === 'object' && res !== null) {
      userData.value.isFollowed = (res as any).isFollowed ?? false
    }
  } catch (err) {
    // 静默失败，不影响主流程
  }
}

const onShareAppMessage = () => {
  if (!userData.value) return {}
  return {
    title: `${userData.value.nickname}的个人主页 - ${systemStore.appName}`,
    path: `/pages/user-detail/index?id=${userData.value.id}`,
    imageUrl: userData.value.avatar || '/static/default-avatar.png',
  }
}

const fetchUserDetail = async () => {
  try {
    loading.value = true
    const res = await request({
      url: `/users/${userId.value}`,
      method: 'GET',
    })

    const rawUser = res.user || res

    if (rawUser) {
      // 处理图片URL：相对路径拼完整URL
      rawUser.avatar = getFullImageUrl(rawUser.avatar) || '/static/default-avatar.png'
      if (rawUser.photos) {
        rawUser.photos = rawUser.photos.map((p: any) => ({
          ...p,
          url: getFullImageUrl(typeof p === 'string' ? p : p.url),
        }))
      }

      userData.value = rawUser as UserDetailData

      if (userData.value.birthYear) {
        userData.value.zodiac = getZodiac(userData.value.birthYear)
        userData.value.constellation = getConstellation(userData.value.birthYear)
      }

      if (userData.value.selfIntro && userData.value.selfIntro.length > 150) {
        introTooLong.value = true
      }

      if (userData.value.mateRequirement && userData.value.mateRequirement.length > 150) {
        requirementTooLong.value = true
      }
    }
  } catch (e) {
    console.error('fetch user detail error', e)
    uni.showToast({
      title: '获取用户信息失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

const fetchMatchmakerList = async () => {
  // eslint-disable-next-line no-console
  console.log('[红娘] fetchMatchmakerList 开始调用')

  try {
    const res = await request({
      url: '/matchmakers',
      method: 'GET',
      timeout: 15000,
    })

    // eslint-disable-next-line no-console
    console.log('[红娘] API 返回类型:', typeof res, '是否为数组:', Array.isArray(res))
    // eslint-disable-next-line no-console
    console.log('[红娘] API 返回原始数据:', JSON.stringify(res).substring(0, 500))

    const rawList: any[] = Array.isArray(res) ? res : (res?.list || res?.data?.list || res?.data || [])
    // eslint-disable-next-line no-console
    console.log('[红娘] rawList 长度:', rawList.length)

    matchmakerList.value = rawList.map((item: any, index: number) => {
      // eslint-disable-next-line no-console
      console.log(`[红娘] 第${index}条 keys:`, Object.keys(item))
      // eslint-disable-next-line no-console
      console.log(`[红娘] 第${index}条 原始:`, JSON.stringify(item).substring(0, 300))

      const resolvedQrCode = getFullImageUrl(item.qrCode || item.qr_code || item.qrcode || item.QRCode)
      const resolvedAvatar = getFullImageUrl(item.avatar || item.avatarUrl)
      // eslint-disable-next-line no-console
      console.log(`[红娘] 第${index}条 qrCode:`, resolvedQrCode, 'avatar:', resolvedAvatar)

      return { ...item, avatar: resolvedAvatar, qrCode: resolvedQrCode }
    })

    // eslint-disable-next-line no-console
    console.log('[红娘] 最终 matchmakerList:', JSON.stringify(matchmakerList.value).substring(0, 500))
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.log('[红娘] 接口调用失败，使用 Mock 数据', e?.message || e)
    matchmakerList.value = [
      {
        id: 1,
        name: '小红娘',
        avatar: '/static/default-avatar.png',
        title: '资深红娘',
        wechat: 'hongniang001',
        phone: '15703592518',
        qrCode: '/static/matchmaker.png',
        description: '10年婚恋服务经验',
      },
      {
        id: 2,
        name: '李老师',
        avatar: '/static/default-avatar.png',
        title: '金牌红娘',
        wechat: 'hongniang002',
        phone: '15703592518',
        qrCode: '/static/matchmaker.png',
        description: '专业配对，成功率98%',
      },
    ]
  }
}

const getZodiac = (year: number): string => {
  const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
  return zodiacs[(year - 1900) % 12]
}

const getConstellation = (birthYear: number): string => {
  return '星座'
}

const handleBack = () => {
  safeNavigateBack()
}

const onPhotoChange = (e: any) => {
  currentPhotoIndex.value = e.detail.current
}

const previewPhoto = (index: number) => {
  if (!userData.value?.photos) return

  const urls = userData.value.photos.map((p) => p.url)
  uni.previewImage({
    current: index,
    urls,
  })
}

const showSharePanel = () => {
  showShare.value = true
}

const closeSharePanel = () => {
  showShare.value = false
}

const shareToFriend = () => {
  closeSharePanel()
  // 引导用户使用右上角原生分享按钮
  // 开发工具中 showShareMenu 可能不可用，真机预览正常
  // #ifdef MP-WEIXIN
  uni.showToast({
    title: '请点击右上角「···」分享给好友',
    icon: 'none',
    duration: 2000,
  })
  // #endif
}

const generatePoster = () => {
  closeSharePanel()
  uni.navigateTo({
    url: `/pages/poster/index?userId=${userId.value}`,
  })
}

const toggleFollow = async () => {
  if (isSelf.value) {
    uni.showToast({ title: '不能关注自己', icon: 'none' })
    return
  }
  // 未登录 → 跳转登录页
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none', duration: 1500 })
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/login/index`
      })
    }, 1000)
    return
  }

  if (!userData.value || followLoading.value) return
  followLoading.value = true

  const isFollowed = userData.value.isFollowed
  const method = isFollowed ? 'DELETE' : 'POST'
  const actionText = isFollowed ? '取消关注' : '关注'

  uni.showLoading({ title: (isFollowed ? '取消中...' : '关注中...'), mask: true })

  try {
    await request({
      url: `/users/${userId.value}/follow`,
      method,
    } as any)

    userData.value.isFollowed = !isFollowed

    uni.hideLoading()
    uni.showToast({
      title: `${actionText}成功`,
      icon: 'success',
      duration: 1500,
    })
  } catch (err: unknown) {
    const error = err as Error
    console.error('toggleFollow error:', error.message)
    uni.hideLoading()

    // 业务异常提示
    const bizErrors: Record<string, string> = {
      '不能关注自己': '不能关注自己哦',
      '已关注该用户': '已关注该用户',
      '未关注该用户': '尚未关注该用户，无法取消',
      '用户不存在': '该用户不存在',
    }

    for (const [key, msg] of Object.entries(bizErrors)) {
      if (error.message?.includes(key)) {
        uni.showToast({ title: msg, icon: 'none', duration: 2000 })
        return
      }
    }

    // 401 由 request.ts 统一处理，不重复 toast
    if (error.message !== 'Unauthorized') {
      uni.showToast({ title: `${actionText}失败，请重试`, icon: 'none' })
    }
  } finally {
    followLoading.value = false
  }
}

const goEditProfile = () => {
  uni.navigateTo({ url: '/pages/edit-profile/index' })
}

const handleChat = () => {
  // 未登录 → 跳转登录页
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none', duration: 1500 })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/index' })
    }, 1000)
    return
  }

  // 非 VIP → 跳转会员页（tabBar 页面必须用 switchTab）
  if (!isVip.value) {
    uni.switchTab({ url: '/pages/vip/index' })
    return
  }

  // 已登录且 VIP → 进入聊天
  uni.navigateTo({
    url: `/pages/chat/index?userId=${userId.value}&nickname=${encodeURIComponent(userData.value?.nickname || '')}`,
  })
}

const showMatchmakerPopup = () => {
  // 如果红娘列表为空，填充Mock数据确保弹窗能打开
  if (!matchmakerList.value || matchmakerList.value.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[红娘] 列表为空，使用 Mock 数据')
    matchmakerList.value = [
      { id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
    ]
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  // eslint-disable-next-line no-console
  console.log('[红娘] 选中红娘 qrCode:', selectedMatchmaker.value.qrCode, 'avatar:', selectedMatchmaker.value.avatar)
  showMatchmaker.value = true
}

const openMatchmakerList = () => {
  showMatchmaker.value = false
  showMatchmakerList.value = true
}

const onSelectMatchmaker = (matchmaker: any) => {
  showMatchmakerList.value = false
  selectedMatchmaker.value = matchmaker
  setTimeout(() => {
    showMatchmaker.value = true
  }, 300)
}

const signCommitment = async () => {
  try {
    await request({ url: '/users/commitment', method: 'POST' } as any)
    hasCommitment.value = true
    showCommitPopup.value = false
    uni.showToast({ title: '签署成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '签署失败', icon: 'none' })
  }
}

const showMoreActions = () => {
  const items = ['分享主页', '举报用户']
  if (!isSelf.value) items.push('拉黑')
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      if (res.tapIndex === 0) shareToFriend()
      else if (res.tapIndex === 1) {
        uni.navigateTo({ url: `/pages/report/index?userId=${userId.value}&type=user` })
      } else {
        blockUser()
      }
    },
  })
}

const blockUser = () => {
  uni.showModal({
    title: '确认拉黑',
    content: '拉黑后将不再看到该用户的动态和消息',
    success: (res) => {
      if (res.confirm) {
        request({ url: `/users/${userId.value}/block`, method: 'POST' })
          .then(() => uni.showToast({ title: '已拉黑', icon: 'success' }))
          .catch(() => uni.showToast({ title: '拉黑失败', icon: 'none' }))
      }
    },
  })
}

const showAuthDetail = (type: string) => {
  let title = ''
  let content = ''

  switch (type) {
    case 'realname':
      title = '实名认证'
      content = userData.value?.isRealName ? '已通过实名认证' : '未认证'
      break
    case 'education':
      title = '学历认证'
      content = userData.value?.education || '未认证'
      break
    case 'housing':
      title = '房产认证'
      content = userData.value?.housingStatus || '未认证'
      break
    case 'car':
      title = '车辆认证'
      content = userData.value?.carStatus || '未认证'
      break
    case 'commitment':
      if (isSelf.value && !hasCommitment.value) {
        showCommitPopup.value = true
        return
      }
      title = '单身承诺'
      content = hasCommitment.value ? '已签署单身承诺书' : '未签署'
      break
    case 'marital':
      title = '婚姻状况'
      content = userData.value?.maritalStatus || '未认证'
      break
  }

  uni.showModal({
    title,
    content,
    showCancel: false,
  })
}
</script>

<style lang="scss" scoped>
.user-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 180rpx;
}

.loading-container,
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 28rpx;
  color: #999;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: transparent;
  z-index: 100;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.more-icon {
  font-size: 40rpx;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.eye-icon {
  font-size: 32rpx;
}

.photo-section {
  position: relative;
  height: 45vh;
  background-color: #000;
}

.photo-swiper {
  width: 100%;
  height: 100%;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.share-btn {
  position: absolute;
  top: 120rpx;
  right: 32rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.share-icon {
  font-size: 36rpx;
  color: #fff;
}

.photo-thumbnails {
  position: absolute;
  left: 32rpx;
  bottom: 32rpx;
  display: flex;
  gap: 12rpx;
  z-index: 10;
}

.thumbnail-item {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  border: 4rpx solid transparent;
  overflow: hidden;
  opacity: 0.6;
  transition: all 0.2s;

  &.active {
    border-color: #FF6B9D;
    opacity: 1;
  }
}

.thumbnail-image {
  width: 100%;
  height: 100%;
}

.info-card {
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  margin-top: -24rpx;
  padding: 32rpx;
  position: relative;
  z-index: 20;
}

.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.name-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.user-name {
  font-size: 40rpx;
  font-weight: bold;
  color: var(--text, #333);
}

.id-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.id-label {
  font-size: 20rpx;
  color: #999;
}

.id-value {
  font-size: 20rpx;
  color: #666;
}

.follow-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: #FFF0F3;
  border-radius: 32rpx;
}

.heart-icon {
  font-size: 32rpx;
}

.follow-text {
  font-size: 24rpx;
  color: #FF6B9D;
}

.basic-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.dot {
  margin: 0 8rpx;
  color: #ddd;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
}

.pink-tag {
  background-color: #FFF0F3;
  color: #FF6B9D;
}

.blue-tag {
  background-color: #EEF4FF;
  color: #4A90E2;
}

.tag-icon {
  font-size: 24rpx;
}

.address-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.address-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.address-icon {
  font-size: 28rpx;
}

.address-icon.blue {
  color: #4A90E2;
}

.address-icon.orange {
  color: #FF9500;
}

.address-label {
  font-size: 24rpx;
  color: #999;
}

.address-value {
  font-size: 24rpx;
  color: var(--text, #333);
}

.auth-section {
  background-color: #fff;
  padding: 24rpx 32rpx;
  margin-top: 16rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--text, #333);
}

.shield-icon,
.book-icon,
.heart-icon-small {
  font-size: 32rpx;
}

.auth-tip {
  font-size: 24rpx;
  color: #999;
}

.auth-scroll {
  white-space: nowrap;
}

.auth-items {
  display: flex;
  gap: 32rpx;
  padding: 8rpx 0;
}

.auth-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.auth-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #fff;

  &.verified {
    background-color: #4A90E2;
  }
}

.auth-label {
  font-size: 24rpx;
  color: #666;
}

.about-section,
.requirement-section {
  background-color: #fff;
  padding: 24rpx 32rpx;
  margin-top: 16rpx;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.info-tag {
  padding: 8rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #666;
}

.intro-content {
  position: relative;
}

.intro-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;

  &.collapsed {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    overflow: hidden;
  }
}

.expand-btn {
  text-align: right;
  margin-top: 12rpx;

  text {
    font-size: 26rpx;
    color: #FF6B9D;
  }
}

.bottom-safe-area {
  height: 120rpx;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.action-btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 48rpx;
  font-size: 30rpx;
  font-weight: bold;
}

.primary-btn {
  background-color: #FF6B9D;
  color: #fff;
}

.secondary-btn {
  background-color: #722ED1;
  color: #fff;
}

.btn-icon {
  font-size: 32rpx;
}

.share-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.share-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.share-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 48rpx 32rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s ease-out;

  &.open {
    transform: translateY(0);
  }
}

.share-option {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
}

.option-icon {
  font-size: 48rpx;
}

.option-text {
  font-size: 30rpx;
  color: var(--text, #333);
}

.share-divider {
  height: 1rpx;
  background-color: #eee;
}

// ========== 单身承诺弹窗 ==========
.commit-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
}

.commit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.commit-card {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
}

.commit-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 32rpx;
}

.commit-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  display: block;
  margin-bottom: 40rpx;
}

.commit-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.commit-cancel {
  font-size: 28rpx;
  color: #999;
  padding: 16rpx 32rpx;
}

.commit-confirm {
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 40rpx;
  padding: 16rpx 40rpx;

  text {
    font-size: 28rpx;
    color: #fff;
    font-weight: 500;
  }
}

.edit-btn {
  background-color: #f5f5f5;
  border: 2rpx solid #ddd;

  text {
    color: #666;
    font-size: 26rpx;
  }
}
</style>
