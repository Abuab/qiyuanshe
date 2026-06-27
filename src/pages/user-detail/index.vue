<template>
  <view class="user-detail-page">
    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <template v-else-if="profileData">
      <!-- ========== 顶部毛玻璃昵称卡片（固定，适配状态栏） ========== -->
      <view class="top-frost-card" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="frost-inner">
          <view class="frost-back" @tap="handleBack">
            <text class="back-arrow">{{ '<' }}</text>
          </view>
          <text class="frost-nickname">{{ profileData.top.nickname || '用户主页' }}</text>
          <view class="frost-placeholder" />
        </view>
      </view>

      <scroll-view class="page-scroll" scroll-y :enhanced="true" :show-scrollbar="false">
        <!-- ========== 1. 顶部大背景图 + 缩略图叠放（占屏 50%） ========== -->
        <view class="hero-section">
          <image
            v-if="activePhotoUrl"
            class="hero-bg"
            :class="{ 'hero-blur': activePhotoNeedsBlur }"
            :src="activePhotoUrl"
            mode="aspectFill"
          />
          <view v-else class="hero-placeholder" />
          <view class="hero-gradient" />
          <!-- 右上角分享按钮 -->
          <view class="hero-share-btn" @tap="openSharePopup">
            <uni-icons type="redo" size="40rpx" color="#fff"></uni-icons>
          </view>
          <!-- 模糊照片上的上传引导 -->
          <view v-if="activePhotoNeedsBlur" class="hero-blur-prompt">
            <text class="blur-prompt-text">我也想更了解你，请先上传你的照片吧～</text>
            <view class="blur-prompt-btn" @tap="handleUploadPhoto">
              <text>上传照片</text>
            </view>
          </view>
          <!-- 照片缩略图：叠放在背景图底部 -->
          <view class="hero-thumbnails" v-if="_displayPhotos.length">
            <view
              v-for="(photo, index) in _displayPhotos"
              :key="index"
              class="hero-thumb"
              :class="{ 'thumb-active': index === activePhotoIndex, 'thumb-blur': photo.isBlurred || photo.needLogin }"
              @tap="onPhotoTap(Number(index))"
            >
              <image
                class="thumb-img"
                :src="getFullImageUrl(photo.url) || '/static/default-avatar.png'"
                mode="aspectFill"
                :style="(photo.isBlurred || photo.needLogin) ? { filter: 'blur(4px)' } : {}"
              />
            </view>
          </view>
        </view>

        <!-- ========== 2. 白色资料卡片（覆盖背景图底部） ========== -->
        <view class="info-card">
          <!-- ===== 语音播放条 ===== -->
          <view
            v-if="voiceEnabled && voiceData && voiceData.auditStatus !== 2"
            class="voice-bar"
            :class="{ 'voice-pending': voiceData.auditStatus === 0 }"
          >
            <view class="voice-bar-inner">
              <view class="voice-mic-icon">
                <uni-icons type="mic-filled" size="32rpx" color="#FF6B6B"></uni-icons>
              </view>
              <text v-if="voiceData.auditStatus === 0" class="voice-label muted">语音审核中</text>
              <text v-else class="voice-label">听听TA的声音</text>
              <view v-if="voiceData.auditStatus === 1" class="voice-right">
                <text class="voice-duration">{{ voiceData.duration }}″</text>
                <view class="voice-play-btn" @tap="toggleVoicePlay">
                  <text class="voice-play-text">{{ isVoicePlaying ? '⏸' : '▶' }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 头部行：昵称 + ID + 关注 -->
          <view class="info-header">
            <view class="info-name-id">
              <text class="info-nickname">{{ profileData.top.nickname }}</text>
              <text class="info-id"><text class="id-badge">ID</text> {{ profileData.top.userId }}</text>
            </view>
            <view v-if="!profileData.top.isSelf" class="follow-wrap" @tap="toggleFollow">
              <view class="follow-btn" :class="{ liked: profileData.top.isFollowed }">
                <uni-icons :type="profileData.top.isFollowed ? 'heart-filled' : 'heart'" size="40rpx" color="#FF6B6B"></uni-icons>
              </view>
              <text class="follow-text">{{ profileData.top.isFollowed ? '已关注' : '关注' }}</text>
            </view>
          </view>

          <!-- 基本资料行：年龄/身高/体重/学历（紧贴昵称下方） -->
          <view class="basic-line" v-if="profileData.basicInfo.age || profileData.basicInfo.height || profileData.basicInfo.weight || profileData.basicInfo.education">
            <text v-if="profileData.basicInfo.age">{{ profileData.basicInfo.age }}岁</text>
            <text v-if="profileData.basicInfo.age && profileData.basicInfo.height" class="dot">·</text>
            <text v-if="profileData.basicInfo.height">{{ profileData.basicInfo.height }}cm</text>
            <text v-if="profileData.basicInfo.height && profileData.basicInfo.weight" class="dot">·</text>
            <text v-if="profileData.basicInfo.weight">{{ profileData.basicInfo.weight }}kg</text>
            <text v-if="(profileData.basicInfo.age || profileData.basicInfo.height || profileData.basicInfo.weight) && profileData.basicInfo.education" class="dot">|</text>
            <text v-if="profileData.basicInfo.education">{{ profileData.basicInfo.education }}</text>
          </view>

          <!-- 生日星座 + 职业 同行 -->
          <view class="info-row-two" v-if="profileData.basicInfo.birthDay || profileData.basicInfo.occupation">
            <view v-if="profileData.basicInfo.birthDay" class="info-chip left-chip">
              <text class="chip-emoji">🎂</text>
              <text>{{ profileData.basicInfo.birthDay }} · {{ profileData.basicInfo.zodiac || '' }}{{ profileData.basicInfo.constellation ? ' · ' + profileData.basicInfo.constellation : '' }}</text>
            </view>
            <view v-if="profileData.basicInfo.occupation" class="info-chip right-chip">
              <text class="chip-emoji">💼</text>
              <text>{{ profileData.basicInfo.occupation }}</text>
            </view>
          </view>

          <!-- 户籍 + 现居（仅展示市+区县） -->
          <view class="location-row">
            <view v-if="profileData.basicInfo.hometown" class="loc-item">
              <text class="loc-dot blue">●</text>
              <text class="loc-label">户籍</text>
              <text class="loc-val">{{ formatCityDistrict(profileData.basicInfo.hometown) }}</text>
            </view>
            <view v-if="profileData.basicInfo.residence" class="loc-item">
              <text class="loc-dot orange">●</text>
              <text class="loc-label">现居</text>
              <text class="loc-val">{{ formatCityDistrict(profileData.basicInfo.residence) }}</text>
            </view>
          </view>
        </view>

        <!-- ========== 3. 身份认证区 ========== -->
        <view class="section-card">
          <view class="section-title-bar">
            <text class="section-title">身份认证</text>
            <text class="section-hint">点亮的为已认证</text>
          </view>
          <!-- 未实名认证：提示+按钮 -->
          <view v-if="isRealNameNotVerified" class="auth-unverified">
            <text class="auth-unverified-text">该用户未实名认证</text>
            <view class="auth-remind-btn" @tap="remindVerify">
              <text>提醒对方认证</text>
            </view>
          </view>
          <!-- 已实名认证：显示认证图标列表 -->
          <scroll-view v-else class="auth-scroll" scroll-x :show-scrollbar="false">
            <view class="auth-items">
              <view
                v-for="item in profileData.identityAuth.items"
                :key="item.type"
                class="auth-item"
                @tap="onAuthTap(item)"
              >
                <view class="auth-circle" :class="{ on: item.verified }">
                  <text>{{ item.verified ? '✓' : '—' }}</text>
                </view>
                <text class="auth-name">{{ item.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- ========== 4. 关于我区 ========== -->
        <view class="section-card">
          <text class="section-title">关于我</text>
          <view v-if="profileData.aboutMe.tags?.length" class="about-tags-grid">
            <view v-for="tag in profileData.aboutMe.tags" :key="tag.name" class="about-capsule">
              <text>{{ tag.name }}</text>
            </view>
          </view>
          <view v-if="profileData.aboutMe.aiProfileText" class="ai-profile-block">
            <view class="ai-label">
              <text class="ai-dot">✨</text>
              <text class="ai-label-text">AI印象</text>
            </view>
            <text class="ai-text">{{ profileData.aboutMe.aiProfileText }}</text>
          </view>
          <view v-if="characterText" class="character-line-wrap">
            <view class="section-divider" />
            <text class="character-line">{{ characterText }}</text>
          </view>
          <view v-if="profileData.top.isSelf && profileData.showAiProfileGenEntry" class="ai-profile-gen-entry" @tap="refreshProfileGen">
            <text class="gen-entry-text">{{ profileData.aboutMe.aiProfileText ? '✨ 刷新AI印象' : '✨ 生成AI印象' }}</text>
            <text class="gen-entry-arrow">→</text>
          </view>
          <view v-else-if="!profileData.aboutMe.tags?.length && !profileData.aboutMe.aiProfileText" class="empty-hint">
            <text>TA还没填写介绍哦～</text>
          </view>
        </view>

        <!-- ========== AI缘分分析入口 ========== -->
        <view v-if="profileData.showAiMatchEntry && !profileData.top.isSelf" class="ai-entry-card" @tap="openAiMatch">
          <view class="ai-entry-content">
            <text class="ai-entry-emoji">💞</text>
            <view class="ai-entry-info">
              <text class="ai-entry-title">AI缘分分析</text>
              <text class="ai-entry-desc">测测你们缘分契合度</text>
            </view>
            <text class="ai-entry-arrow">→</text>
          </view>
        </view>

        <!-- ========== AI趣味测试入口 ========== -->
        <view v-if="profileData.showAiFunQuizEntry && !profileData.top.isSelf" class="ai-entry-card" @tap="openFunQuiz">
          <view class="ai-entry-content">
            <text class="ai-entry-emoji">🔮</text>
            <view class="ai-entry-info">
              <text class="ai-entry-title">AI趣味测试</text>
              <text class="ai-entry-desc">看星座生肖契合密码</text>
            </view>
            <text class="ai-entry-arrow">→</text>
          </view>
        </view>

        <!-- ========== 5. Ta希望你区 ========== -->
        <view class="section-card">
          <text class="section-title">Ta希望你</text>
          <view v-if="cleanedPartnerTags.length" class="partner-tags-grid">
            <view v-for="pt in cleanedPartnerTags" :key="pt.label" class="partner-capsule">
              <text class="pt-value">{{ pt.value }}</text>
            </view>
          </view>
          <view v-if="profileData.hopeTa.aiHopeText" class="ai-hope-block">
            <view class="ai-label">
              <text class="ai-dot">✨</text>
              <text class="ai-label-text">AI期望解读</text>
            </view>
            <text class="ai-text">{{ profileData.hopeTa.aiHopeText }}</text>
          </view>
          <view v-if="hopeText" class="hope-line-wrap">
            <view class="section-divider" />
            <text class="hope-line">{{ hopeText }}</text>
          </view>
          <view v-if="!cleanedPartnerTags.length && !profileData.hopeTa.aiHopeText" class="empty-hint">
            <text>TA还没填写期待哦～</text>
          </view>
        </view>

        <!-- ========== 6. Ta的问答 ========== -->
        <view v-if="profileData.answers?.length" class="section-card qa-card">
          <text class="section-title">Ta的问答</text>
          <view v-for="(item, idx) in profileData.answers" :key="idx" class="qa-item">
            <!-- 问题气泡（左：红心头像） -->
            <view class="qa-row qa-question-row">
              <view class="qa-avatar qa-question-avatar">❤️</view>
              <view class="qa-bubble qa-bubble-question">
                <text>{{ item.question }}</text>
              </view>
            </view>
            <!-- 回答气泡（右：用户头像） -->
            <view class="qa-row qa-answer-row">
              <view class="qa-bubble qa-bubble-answer">
                <text>{{ item.answer }}</text>
              </view>
              <image
                class="qa-avatar qa-user-avatar"
                :src="profileData.top.avatar"
                mode="aspectFill"
              />
            </view>
          </view>
        </view>

        <!-- ========== 7. 爱情语录 ========== -->
        <view v-if="profileData.loveQuote" class="section-card love-quote-card">
          <text class="section-title">Ta的爱情语录</text>
          <text class="love-quote-text">{{ profileData.loveQuote }}</text>
        </view>

        <!-- ========== 7. 介绍给好友 ========== -->
        <view class="share-capsule" @tap="openSharePopup">
          <text class="capsule-text">介绍给好友</text>
        </view>

        <!-- ========== 7. 举报 / 拉黑 ========== -->
        <view class="report-block-row">
          <text class="report-link" @tap="openReportSheet">举报</text>
          <text class="report-divider">|</text>
          <text v-if="isBlocked" class="report-link" @tap="confirmUnblock">已拉黑</text>
          <text v-else class="report-link" @tap="confirmBlock">拉黑</text>
        </view>

        <view class="bottom-spacer" />
      </scroll-view>

      <!-- ========== 底部悬浮操作按钮（固定） ========== -->
      <view v-if="profileData.bottomBar.visible" class="bottom-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
        <view class="bb-btn contact-btn" @tap="handleContact">
          <text>想认识Ta</text>
        </view>
        <view class="bb-btn matchmaker-btn" @tap="showMatchmakerPopup">
          <text>红娘牵线</text>
        </view>
      </view>

      <!-- ========== 关注后订阅弹窗 ========== -->
      <view v-if="showSubscribeDialog" class="dialog-overlay" @tap="closeSubscribeDialog">
        <view class="dialog-card" @tap.stop>
          <text class="dialog-title">总是保持订阅，不错过重要信息</text>
          <view class="dialog-buttons">
            <view class="dialog-btn cancel-btn" @tap="closeSubscribeDialog">
              <text>取消</text>
            </view>
            <view class="dialog-btn allow-btn" @tap="handleSubscribeAllow">
              <text>允许</text>
            </view>
          </view>
          <label class="dialog-check-label">
            <checkbox :checked="alwaysSubscribe" @tap="alwaysSubscribe = !alwaysSubscribe" style="transform:scale(0.7)" />
            <text>总是保持以上选择，不再询问</text>
          </label>
        </view>
      </view>

      <!-- ========== 拉黑确认弹窗 ========== -->
      <view v-if="showBlockDialog" class="dialog-overlay" @tap="showBlockDialog = false">
        <view class="dialog-card" @tap.stop>
          <text class="dialog-title">提示</text>
          <text class="dialog-desc">拉黑后，首页将不展示对方信息。\n可在'个人中心->黑名单'中解除。</text>
          <view class="dialog-buttons">
            <view class="dialog-btn cancel-btn" @tap="showBlockDialog = false">
              <text>取消</text>
            </view>
            <view class="dialog-btn allow-btn block-confirm-btn" @tap="doBlock">
              <text>确定</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ========== 取消拉黑确认弹窗 ========== -->
      <view v-if="showUnblockDialog" class="dialog-overlay" @tap="showUnblockDialog = false">
        <view class="dialog-card" @tap.stop>
          <text class="dialog-title">提示</text>
          <text class="dialog-desc">确定取消拉黑该用户吗？</text>
          <view class="dialog-buttons">
            <view class="dialog-btn cancel-btn" @tap="showUnblockDialog = false">
              <text>取消</text>
            </view>
            <view class="dialog-btn allow-btn" @tap="doUnblock">
              <text>确定</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ========== 举报底部弹窗 ========== -->
      <view v-if="showReportSheet" class="report-sheet-overlay" @tap="closeReportSheet">
        <view class="report-sheet" :class="{ 'sheet-up': reportSheetAnim }" @tap.stop>
          <!-- 标题栏 -->
          <view class="report-header">
            <text class="report-title">举报原因</text>
            <view class="report-close" @tap="closeReportSheet">
              <text>✕</text>
            </view>
          </view>

          <!-- 原因标签 -->
          <view class="report-tags">
            <view
              v-for="reason in reportReasons"
              :key="reason"
              class="report-tag"
              :class="{ 'tag-selected': selectedReportReasons.includes(reason) }"
              @tap="toggleReportReason(reason)"
            >
              <text>{{ reason }}</text>
            </view>
          </view>

          <!-- 举报内容 -->
          <view class="report-content-section">
            <view class="textarea-wrap">
              <textarea
                class="report-textarea"
                v-model="reportContent"
                placeholder="请填写您的举报理由"
                placeholder-style="color: #ccc; font-size: 28rpx;"
                maxlength="200"
                :adjust-position="true"
                :show-confirm-bar="false"
              />
              <text class="char-count">{{ reportContent.length }}/200</text>
            </view>
          </view>

          <!-- 证据截图 -->
          <view class="report-image-section">
            <text class="image-section-title">证据截图（最多上传6张）</text>
            <view class="image-list">
              <view v-for="(img, idx) in reportImages" :key="idx" class="image-item">
                <image class="image-thumb" :src="img.url" mode="aspectFill" @tap="previewReportImage(idx)" />
                <view class="image-delete" @tap.stop="removeReportImage(idx)">
                  <text>✕</text>
                </view>
                <view v-if="img.uploading" class="image-loading-mask">
                  <text>上传中</text>
                </view>
              </view>
              <view v-if="reportImages.length < 6" class="image-add-btn" @tap="handleReportChooseImage">
                <text class="add-plus">+</text>
              </view>
            </view>
          </view>

          <!-- 提交按钮 -->
          <view class="report-submit-area" :style="{ paddingBottom: safeAreaBottom + 'px' }">
            <view class="report-submit-btn" @tap="handleReportSubmit">
              <text>提交</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ========== AI缘分分析弹窗 ========== -->
      <ai-match-popup
        v-if="showAiMatchPopup"
        :show="showAiMatchPopup"
        :target-user-id="userId"
        :target-nickname="profileData.top.nickname"
        @update:show="showAiMatchPopup = $event"
      />

      <!-- ========== AI趣味测试弹窗 ========== -->
      <view v-if="showFunQuizPopup" class="funquiz-overlay" @tap="showFunQuizPopup = false">
        <view class="funquiz-panel" @tap.stop>
          <view class="funquiz-header">
            <text class="funquiz-title">AI趣味缘分测试</text>
            <view class="funquiz-close" @tap="showFunQuizPopup = false"><text>✕</text></view>
          </view>
          <template v-if="!funQuizResult">
            <scroll-view class="funquiz-body" scroll-y :enhanced="true" :show-scrollbar="false">
              <view class="funquiz-body-inner">
                <text class="funquiz-desc">输入你和{{ profileData.top.nickname }}的生日，AI会为你们生成一份趣味缘分密码报告</text>
                <view class="funquiz-field">
                  <text class="funquiz-label">我的生日</text>
                  <picker mode="date" :end="today" @change="(e: any) => funQuizBirthday.userBirthDay = e.detail.value">
                    <view class="funquiz-picker">{{ funQuizBirthday.userBirthDay || '点击选择' }}</view>
                  </picker>
                </view>
                <view class="funquiz-field">
                  <text class="funquiz-label">TA的生日</text>
                  <picker mode="date" :end="today" @change="(e: any) => funQuizBirthday.taBirthDay = e.detail.value">
                    <view class="funquiz-picker">{{ funQuizBirthday.taBirthDay || '点击选择' }}</view>
                  </picker>
                </view>
              </view>
            </scroll-view>
            <view class="funquiz-footer">
              <view class="funquiz-btn" :class="{ disabled: funQuizLoading }" @tap="submitFunQuiz">
                <text>{{ funQuizLoading ? '生成中...' : '开始测试' }}</text>
              </view>
            </view>
          </template>
          <template v-else>
            <scroll-view class="funquiz-body funquiz-result-body" scroll-y :enhanced="true" :show-scrollbar="false">
              <view class="funquiz-body-inner">
                <view class="fq-result-header">
                  <text class="fq-zodiac">{{ funQuizResult.userZodiac }} · {{ funQuizResult.userConstellation }}</text>
                  <text class="fq-vs">💞</text>
                  <text class="fq-zodiac">{{ funQuizResult.taZodiac }} · {{ funQuizResult.taConstellation }}</text>
                </view>
                <view class="fq-keywords">
                  <text v-for="(k, i) in funQuizResult.keywords" :key="i" class="fq-keyword">{{ k }}</text>
                </view>
                <view class="fq-section">
                  <text class="fq-section-title">性格互补分析</text>
                  <text class="fq-section-text">{{ funQuizResult.personalityAnalysis }}</text>
                </view>
                <view class="fq-section">
                  <text class="fq-section-title">相处模式建议</text>
                  <text class="fq-section-text">{{ funQuizResult.relationshipAdvice }}</text>
                </view>
                <view v-if="funQuizResult.timeNodes?.length" class="fq-section">
                  <text class="fq-section-title">未来趣味节点</text>
                  <view v-for="(n, i) in funQuizResult.timeNodes" :key="i" class="fq-node">
                    <text class="fq-node-day">{{ n.day }}</text>
                    <text class="fq-node-title">{{ n.title }}</text>
                    <text class="fq-node-desc">{{ n.desc }}</text>
                  </view>
                </view>
                <view class="fq-disclaimer">仅供娱乐参考，珍惜真实相处时光</view>
              </view>
            </scroll-view>
            <view class="funquiz-footer">
              <view class="funquiz-btn funquiz-retry-btn" @tap="retryFunQuiz">
                <text>重新测试</text>
              </view>
            </view>
          </template>
        </view>
      </view>

      <!-- ========== 红娘弹窗 ========== -->
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

      <!-- ========== 分享底部弹窗 ========== -->
      <view v-if="showSharePopup" class="share-popup-overlay" @tap="closeSharePopup">
        <view class="share-popup-sheet" :class="{ 'sheet-up': sharePopupAnim }" @tap.stop>
          <view class="share-popup-handle" />
          <view class="share-popup-options">
            <button class="share-option" open-type="share" @click="closeSharePopup">
              <text class="share-option-label">分享给好友</text>
            </button>
            <view class="share-option" @tap="generatePoster">
              <text class="share-option-label">生成海报</text>
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

<script lang="ts">
export default {
  onShareAppMessage() {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    return {
      title: `${page?.profileData?.top?.nickname || ''}的个人主页`,
      path: `/pages/user-detail/index?id=${page?.userId || 0}`,
      imageUrl: page?.profileData?.top?.avatar || '',
    }
  },
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { uploadImage } from '@/utils/upload'
import { useUserStore } from '@/store/user'
import { logger } from '@/utils/logger'
import matchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import matchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import aiMatchPopup from '@/components/ai-match-popup/ai-match-popup.vue'
import { safeNavigateBack } from '@/utils/navigate'

const userStore = useUserStore()

const userId = ref(0)
const loading = ref(true)
const profileData = ref<any>(null)

// ===== 语音 =====
const voiceEnabled = ref(true)
const voiceData = ref<{ voiceUrl: string; duration: number; auditStatus: number } | null>(null)
const isVoicePlaying = ref(false)
let voiceAudioCtx: any = null
const showAiMatchPopup = ref(false)
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])
const followLoading = ref(false)

// ===== 照片 =====
const activePhotoIndex = ref(0)
const _displayPhotos = computed(() => {
  const photos = profileData.value?.photos || []
  const avatar = profileData.value?.top?.avatar || ''
  if (photos.length > 0) return photos
  if (avatar) return [{ url: avatar, isAvatarOnly: true }]
  return []
})

const activePhotoUrl = computed(() => {
  const photos = _displayPhotos.value
  if (!photos.length) return null
  const p = photos[activePhotoIndex.value]
  return p ? getFullImageUrl(p.url) : null
})
const activePhotoNeedsBlur = computed(() => {
  const photos = profileData.value?.photos
  const p = photos?.[activePhotoIndex.value]
  return !!(p?.isBlurred || p?.needLogin)
})

// ===== 性格/希望标签拼接文案（按管理后台简介模板） =====
const cleanedPartnerTags = computed(() => {
  const tags = profileData.value?.hopeTa?.partnerTags
  if (!tags?.length) return [] as { label: string; value: string }[]
  return tags.map((t: any) => {
    let val = t.value || ''
    // 身高：去除重复的 cm以上 后缀
    if (t.label === '身高要求') {
      val = val.replace(/([cC][mM])?以上.*$/, '').trim()
      val = val ? `${val}cm以上` : ''
    }
    // 收入：添加"月收入"前缀
    if (t.label === '收入要求' && val && !val.startsWith('月收入')) {
      val = `月收入${val}`
    }
    return { label: t.label, value: val }
  })
})

const characterText = computed(() => {
  const tags = profileData.value?.personalityTags
  if (!tags) return ''
  // 结构化对象 { character:[], hobby:[], loveRule:[] }
  if (typeof tags === 'object' && !Array.isArray(tags)) {
    const parts: string[] = []
    const char = (tags as any).character
    const hobby = (tags as any).hobby
    const loveRule = (tags as any).loveRule
    if (char?.length) parts.push(`我是一个${char.join('、')}的人`)
    return parts.join('，')
  }
  // 扁平数组
  const arr = Array.isArray(tags) ? tags : []
  return arr.length ? `我是一个${arr.join('、')}的人` : ''
})

const hopeText = computed(() => {
  const tags = profileData.value?.hopeTaTags
  if (!tags) return ''
  // 结构化对象
  if (typeof tags === 'object' && !Array.isArray(tags)) {
    const all = [...((tags as any).character || []), ...((tags as any).hobby || []), ...((tags as any).loveRule || [])]
    return all.length ? `希望你${all.join('，')}` : ''
  }
  // 扁平数组
  const arr = Array.isArray(tags) ? tags : []
  return arr.length ? `希望你${arr.join('，')}` : ''
})

const isLoggedIn = computed(() => userStore.isLoggedIn)
const statusBarHeight = computed(() => {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 44
  } catch { return 44 }
})
const safeAreaBottom = computed(() => {
  const sysInfo = uni.getSystemInfoSync()
  return (sysInfo.safeAreaInsets?.bottom ?? sysInfo.safeArea?.bottom ?? 20)
})

// ===== 订阅弹窗 =====
const showSubscribeDialog = ref(false)
const alwaysSubscribe = ref(false)

// ===== 拉黑弹窗 =====
const showBlockDialog = ref(false)
const isBlocked = ref(false)

// ===== 举报弹窗 =====
const showReportSheet = ref(false)
const reportSheetAnim = ref(false)
const reportReasons = ['其他', '色情相关', '头像/资料虚假', '酒托/饭托', '诈骗钱财']
const selectedReportReasons = ref<string[]>([])
const reportContent = ref('')
interface ReportImage { url: string; uploading: boolean }
const reportImages = ref<ReportImage[]>([])

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

// ===== 地址格式化：截取最后两个行政级别（市 + 区县） =====
const formatCityDistrict = (address: string): string => {
  if (!address) return ''
  const parts = address.split(/[\/,，]/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) return parts.slice(-2).join('')
  return parts.join('')
}

// ===== 语音 =====
async function fetchVoiceEnabled() {
  try {
    const res: any = await request({ url: '/system/config?key=feature.voiceEnabled', method: 'GET' })
    if (res.code === 0 && res.data) voiceEnabled.value = res.data.value !== 'false'
  } catch { voiceEnabled.value = true }
}

function toggleVoicePlay() {
  if (isVoicePlaying.value) { stopVoice(); return }
  if (!voiceData.value?.voiceUrl) return
  voiceAudioCtx = uni.createInnerAudioContext()
  voiceAudioCtx.src = voiceData.value.voiceUrl
  voiceAudioCtx.onPlay(() => { isVoicePlaying.value = true })
  voiceAudioCtx.onEnded(() => { isVoicePlaying.value = false })
  voiceAudioCtx.onError(() => { isVoicePlaying.value = false })
  voiceAudioCtx.play()
}

function stopVoice() {
  if (voiceAudioCtx) { voiceAudioCtx.stop(); voiceAudioCtx.destroy(); voiceAudioCtx = null }
  isVoicePlaying.value = false
}

async function fetchVoiceIntro() {
  if (!voiceEnabled.value) return
  try {
    const res: any = await request({ url: `/users/${userId.value}/voice-intro`, method: 'GET' })
    if (res.code === 0 && res.data) voiceData.value = res.data
  } catch { /* 404 不显示 */ }
}

onMounted(async () => {
  await fetchVoiceEnabled()
  uni.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'], fail: () => {} })
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  if (opts.id) {
    userId.value = parseInt(opts.id)
    fetchProfileDetail()
  } else {
    loading.value = false
  }
  fetchMatchmakerList()
  fetchVoiceIntro()
})

onShow(() => {
  if (userId.value && isLoggedIn.value && profileData.value) {
    refreshFollowStatus()
  }
})

const refreshFollowStatus = async () => {
  try {
    const res = await request({ url: `/users/${userId.value}/follow-status`, method: 'GET' })
    if (profileData.value && res) {
      profileData.value.top.isFollowed = (res as any).isFollowed ?? false
    }
  } catch { /* ignore */ }
}

const fetchProfileDetail = async () => {
  loading.value = true
  try {
    const res = await request({ url: `/users/${userId.value}/detail`, method: 'GET' })
    profileData.value = res
    if (profileData.value) {
      profileData.value.top.avatar = getFullImageUrl(profileData.value.top.avatar) || '/static/default-avatar.png'
      profileData.value.top.backgroundPhoto = getFullImageUrl(profileData.value.top.backgroundPhoto) || ''
    }
    // 检查是否已拉黑
    if (isLoggedIn.value) {
      checkBlockStatus()
    }
  } catch {
    uni.showToast({ title: '获取用户信息失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const checkBlockStatus = async () => {
  try {
    const res: any = await request({ url: '/users/my-blocks', method: 'GET' })
    const blocks = Array.isArray(res) ? res : (res?.list || res?.data?.list || [])
    isBlocked.value = blocks.some((b: any) => b.blockedUserId === userId.value || b.id === userId.value || b.userId === userId.value)
  } catch { /* ignore */ }
}

const fetchMatchmakerList = async () => {
  try {
    const res: any = await request({ url: '/matchmakers', method: 'GET', timeout: 15000 })
    const rawList = Array.isArray(res) ? res : (res?.list || res?.data?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      avatar: getFullImageUrl(item.avatar || item.avatarUrl),
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
    }))
  } catch {
    matchmakerList.value = [
      { id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
    ]
  }
}

const handleBack = () => safeNavigateBack()

const onPhotoTap = (index: number) => {
  const photo = profileData.value?.photos?.[index]
  if (!photo) return
  activePhotoIndex.value = index
}

const handleUploadPhoto = () => {
  uni.navigateTo({ url: '/pages/edit-profile/index' })
}

const onAuthTap = (item: any) => {
  uni.showModal({ title: item.label, content: item.verified ? '已认证' : '未认证', showCancel: false })
}

// ===== 是否未实名认证 =====
const isRealNameNotVerified = computed(() => {
  const items = profileData.value?.identityAuth?.items
  if (!items) return true
  const realName = items.find((i: any) => i.type === 'real_name')
  return !realName?.verified
})

// ===== 提醒对方认证 =====
const remindVerify = () => {
  uni.showToast({ title: '已发送提醒', icon: 'success' })
}

// ===== 关注 / 取消关注 =====
const toggleFollow = async () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  if (!profileData.value || followLoading.value) return
  followLoading.value = true
  const followed = profileData.value.top.isFollowed
  try {
    await request({ url: `/users/${userId.value}/follow`, method: followed ? 'DELETE' : 'POST' })
    profileData.value.top.isFollowed = !followed
    uni.showToast({ title: followed ? '已取消关注' : '关注成功', icon: 'success', duration: 1000 })
    // 操作完成后弹出订阅弹窗
    setTimeout(() => {
      showSubscribeDialog.value = true
    }, 1200)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    followLoading.value = false
  }
}

const closeSubscribeDialog = () => {
  showSubscribeDialog.value = false
}

const handleSubscribeAllow = () => {
  showSubscribeDialog.value = false
  if (alwaysSubscribe.value) {
    uni.setStorageSync('subscribe_always_allow', true)
  }
}

// ===== 拉黑 =====
const confirmBlock = () => {
  showBlockDialog.value = true
}

const doBlock = async () => {
  showBlockDialog.value = false
  try {
    await request({ url: `/users/${userId.value}/block`, method: 'POST' })
    isBlocked.value = true
    uni.showToast({ title: '已拉黑', icon: 'success' })
  } catch {
    uni.showToast({ title: '拉黑失败', icon: 'none' })
  }
}

// ===== 取消拉黑 =====
const showUnblockDialog = ref(false)

const confirmUnblock = () => {
  showUnblockDialog.value = true
}

const doUnblock = async () => {
  showUnblockDialog.value = false
  try {
    await request({ url: `/users/${userId.value}/block`, method: 'DELETE' })
    isBlocked.value = false
    uni.showToast({ title: '已取消拉黑', icon: 'success' })
  } catch {
    uni.showToast({ title: '取消拉黑失败', icon: 'none' })
  }
}

// ===== 举报底部弹窗 =====
const openReportSheet = () => {
  selectedReportReasons.value = []
  reportContent.value = ''
  reportImages.value = []
  showReportSheet.value = true
  nextTick(() => {
    setTimeout(() => { reportSheetAnim.value = true }, 50)
  })
}

const closeReportSheet = () => {
  reportSheetAnim.value = false
  setTimeout(() => { showReportSheet.value = false }, 300)
}

const toggleReportReason = (reason: string) => {
  const idx = selectedReportReasons.value.indexOf(reason)
  if (idx > -1) selectedReportReasons.value.splice(idx, 1)
  else selectedReportReasons.value.push(reason)
}

const handleReportChooseImage = () => {
  const remain = 6 - reportImages.value.length
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const paths = res.tempFilePaths as string[]
      uploadReportImages(paths)
    },
    fail: (err: any) => {
      if (err.errMsg !== 'chooseImage:fail cancel') {
        uni.showToast({ title: '选择图片失败', icon: 'none' })
      }
    },
  })
}

const uploadReportImages = async (tempFilePaths: string[]) => {
  for (const filePath of tempFilePaths) {
    const item: ReportImage = { url: filePath, uploading: true }
    reportImages.value.push(item)
    const currentIdx = reportImages.value.length - 1
    try {
      const result = await uploadImage(filePath, 'file')
      reportImages.value[currentIdx] = { url: result.url, uploading: false }
    } catch (err: any) {
      reportImages.value.splice(currentIdx, 1)
      uni.showToast({ title: err.message || '图片上传失败，请重试', icon: 'none', duration: 2000 })
    }
  }
}

const removeReportImage = (idx: number) => {
  reportImages.value.splice(idx, 1)
}

const previewReportImage = (idx: number) => {
  const urls = reportImages.value.map((img) => img.url)
  uni.previewImage({ current: idx, urls })
}

const handleReportSubmit = async () => {
  if (selectedReportReasons.value.length === 0 && !reportContent.value.trim()) {
    uni.showToast({ title: '请选择举报原因或填写举报理由', icon: 'none' })
    return
  }
  try {
    const imageUrls = reportImages.value.filter((img) => !img.uploading).map((img) => img.url)
    await request({
      url: '/reports',
      method: 'POST',
      data: {
        targetUserId: userId.value,
        type: 'user',
        reason: selectedReportReasons.value.join('、'),
        content: reportContent.value.trim(),
        images: imageUrls,
      },
    })
    uni.showToast({ title: '举报已提交', icon: 'success' })
    closeReportSheet()
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  }
}

const openAiMatch = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  showAiMatchPopup.value = true
}

const showFunQuizPopup = ref(false)
const funQuizBirthday = ref({ userBirthDay: '', taBirthDay: '' })
const funQuizLoading = ref(false)
const funQuizResult = ref<any>(null)

const extractBirthYear = (birthDay?: string): number | null => {
  if (!birthDay || typeof birthDay !== 'string') return null
  const match = birthDay.match(/(\d{4})/)
  return match ? parseInt(match[1], 10) : null
}

const openFunQuiz = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  funQuizResult.value = null
  const myBirthYear = userStore.userInfo?.birthYear
  funQuizBirthday.value.userBirthDay = myBirthYear ? `${myBirthYear}-01-01` : ''
  const taBirthDay = profileData.value?.basicInfo?.birthDay
  const taYear = extractBirthYear(taBirthDay)
  funQuizBirthday.value.taBirthDay = taYear ? `${taYear}-01-01` : ''
  showFunQuizPopup.value = true
}

const submitFunQuiz = async () => {
  if (!funQuizBirthday.value.userBirthDay || !funQuizBirthday.value.taBirthDay) {
    uni.showToast({ title: '请填写双方的出生日期', icon: 'none' })
    return
  }
  funQuizLoading.value = true
  try {
    const res: any = await request({
      url: '/ai/fun-quiz/generate',
      method: 'POST',
      data: funQuizBirthday.value,
      timeout: 30000,
      skipToast: true,
    })
    funQuizResult.value = res
  } catch (e: any) {
    logger.error('[funQuiz] 生成失败:', e?.message || e)
    uni.showToast({ title: '缘分正在生成中，请稍后再试～', icon: 'none', duration: 2000 })
  } finally {
    funQuizLoading.value = false
  }
}

const retryFunQuiz = () => {
  funQuizResult.value = null
  const myBirthYear = userStore.userInfo?.birthYear
  funQuizBirthday.value.userBirthDay = myBirthYear ? `${myBirthYear}-01-01` : ''
  const taBirthDay2 = profileData.value?.basicInfo?.birthDay
  const taYear2 = extractBirthYear(taBirthDay2)
  funQuizBirthday.value.taBirthDay = taYear2 ? `${taYear2}-01-01` : ''
}

const profileGenLoading = ref(false)
const refreshProfileGen = async () => {
  profileGenLoading.value = true
  try {
    const res: any = await request({ url: '/ai/profile-gen/refresh', method: 'POST' })
    if (res?.personaText) {
      profileData.value.aboutMe.aiProfileText = res.personaText
    }
    uni.showToast({ title: 'AI印象已生成', icon: 'success' })
    await fetchProfileDetail()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '生成失败，请完善资料后重试', icon: 'none' })
  } finally {
    profileGenLoading.value = false
  }
}

const handleContact = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  if (!userStore.isVip) {
    uni.switchTab({ url: '/pages/vip/index' })
    return
  }
  uni.navigateTo({ url: `/pages/chat/index?userId=${userId.value}&nickname=${encodeURIComponent(profileData.value.top.nickname || '')}&avatar=${encodeURIComponent(profileData.value.top.avatar || '')}` })
}

const showMatchmakerPopup = () => {
  if (!matchmakerList.value.length) {
    matchmakerList.value = [{ id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' }]
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  showMatchmaker.value = true
}

const openMatchmakerList = () => { showMatchmaker.value = false; showMatchmakerList.value = true }
const onSelectMatchmaker = (m: any) => { showMatchmakerList.value = false; selectedMatchmaker.value = m; setTimeout(() => { showMatchmaker.value = true }, 300) }

// ===== 分享底部弹窗 =====
const showSharePopup = ref(false)
const sharePopupAnim = ref(false)

const openSharePopup = () => {
  showSharePopup.value = true
  nextTick(() => {
    setTimeout(() => { sharePopupAnim.value = true }, 50)
  })
}

const closeSharePopup = () => {
  sharePopupAnim.value = false
  setTimeout(() => { showSharePopup.value = false }, 300)
}

const generatePoster = () => {
  closeSharePopup()
  setTimeout(() => {
    uni.navigateTo({ url: `/pages/poster/index?userId=${userId.value}` })
  }, 350)
}
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;
$purple: #7C3AED;
$bg: #F5F5F5;
$card-bg: #FFFFFF;
$text: #1A1A1A;
$text-secondary: #666666;
$text-hint: #999999;

.user-detail-page {
  min-height: 100vh;
  background: $bg;
}

.loading-container, .empty-container {
  display: flex; align-items: center; justify-content: center; height: 100vh;
  font-size: 28rpx; color: $text-hint;
}

// ===== 顶部毛玻璃昵称卡片（固定，粉色） =====
.top-frost-card {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  background: linear-gradient(180deg, #FFE4EC 0%, #FFE4EC 60%, #FFF0F5 100%);
}

.frost-inner {
  display: flex; align-items: center; justify-content: space-between;
  height: 88rpx; padding: 0 24rpx;
}

.frost-back {
  width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center;
}

.back-arrow {
  font-size: 40rpx; color: $text; font-weight: 500;
}

.frost-nickname {
  font-size: 32rpx; font-weight: bold; color: $text;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;
}

.frost-placeholder {
  width: 56rpx;
}

// ===== 滚动区域 =====
.page-scroll {
  height: 100vh;
}

// ===== 1. 顶部大背景图（50vh，卡片覆盖底部） =====
.hero-section {
  position: relative; width: 100%; height: 50vh; min-height: 600rpx; overflow: hidden;
  border-radius: 48rpx 48rpx 0 0;
}

.hero-bg {
  width: 100%; height: 100%;
}

.hero-placeholder {
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-gradient {
  position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.45));
}

// ===== 右上角分享按钮 =====
.hero-share-btn {
  position: absolute; top: 88rpx; right: 24rpx; z-index: 20;
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center;
}

// ===== 照片缩略图：叠放在背景图底部（卡片上方） =====
.hero-thumbnails {
  position: absolute; bottom: 80rpx; left: 24rpx; right: 24rpx; z-index: 10;
  display: flex; gap: 32rpx; overflow-x: auto;
}

.hero-thumb {
  flex-shrink: 0; width: 100rpx; height: 100rpx; border-radius: 12rpx;
  overflow: hidden; border: 3rpx solid rgba(255, 255, 255, 0.6);
  &.thumb-active { border-color: #fff; }
  &.thumb-blur { border-color: rgba(255, 255, 255, 0.3); }
}

.thumb-img {
  width: 100%; height: 100%; display: block;
}

// ===== 语音播放条 =====
.voice-bar {
  margin: 0 0 20rpx; height: 80rpx; border-radius: 40rpx;
  background: #fff0f3; display: flex; align-items: center; padding: 0 32rpx;
  &.voice-pending { opacity: 0.5; }
}

.voice-bar-inner { display: flex; align-items: center; width: 100%; }

.voice-mic-icon { animation: voicePulse 1.5s infinite; }

@keyframes voicePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.voice-label { margin-left: 16rpx; font-size: 28rpx; color: #333; &.muted { color: #999; } }

.voice-right { margin-left: auto; display: flex; align-items: center; }

.voice-duration { font-size: 28rpx; color: #666; }

.voice-play-btn { margin-left: 16rpx; }

.voice-play-text { font-size: 40rpx; color: #ff6b6b; line-height: 1; }

// ===== 2. 白色资料卡片（覆盖背景图底部，顶部圆角露出背景） =====
.info-card {
  background: $card-bg; border-radius: 48rpx 48rpx 0 0;
  margin: -40rpx 0 0; padding: 32rpx 28rpx 20rpx;
  position: relative; z-index: 10;
}

.info-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0;
}

.info-name-id {
  display: flex; align-items: center; gap: 6rpx; flex: 1; min-width: 0;
}

.info-nickname {
  font-size: 36rpx; font-weight: bold; color: $text;
}

.info-id {
  font-size: 24rpx; color: $text-hint;
}

.id-badge {
  display: inline-block;
  font-style: italic;
  font-size: 22rpx;
  font-weight: bold;
  color: #fff;
  background-color: #999;
  padding: 1rpx 5rpx;
  border-radius: 20rpx;
  line-height: 1.4;
  margin-right: 4rpx;
}

// ===== 心动按钮（对标首页 user-card） =====
.follow-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 10rpx;
  flex-shrink: 0;
}

.follow-btn {
  position: relative;
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.3);
  display: flex; align-items: center; justify-content: center;
  transition: transform 300ms ease;
  flex-shrink: 0;
}

.follow-text {
  font-size: 18rpx; color: #999; line-height: 1;
}

.follow-btn.liked {
  animation: heartBounce 300ms ease;
}

@keyframes heartBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

// ===== 生日星座 + 职业 同行 =====
.info-row-two {
  display: flex; gap: 16rpx; margin-bottom: 18rpx; flex-wrap: wrap;
}

.info-chip {
  display: inline-flex; align-items: center; gap: 8rpx;
  padding: 10rpx 20rpx; border-radius: 20rpx; font-size: 24rpx;
  flex-shrink: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.left-chip {
  background: #FFF0F3; color: $pink;
}

.right-chip {
  background: #EEF4FF; color: #4A90E2;
}

.chip-emoji { font-size: 24rpx; flex-shrink: 0; }

// ===== 基本资料 =====
.basic-line {
  display: flex; align-items: center; flex-wrap: wrap;
  font-size: 26rpx; color: #333; margin-bottom: 0;
}

.dot { margin: 0 8rpx; color: #ddd; }

// ===== 户籍现居 =====
.location-row { display: flex; flex-wrap: wrap; gap: 32rpx; }

.loc-item { display: flex; align-items: center; gap: 8rpx; }

.loc-dot { font-size: 20rpx; &.blue { color: #4A90E2; } &.orange { color: #FF9500; } }

.loc-label { font-size: 22rpx; color: $text-hint; }

.loc-val { font-size: 24rpx; color: $text; }

// ===== 分区卡片通用 =====
.section-card {
  background: $card-bg; margin: 16rpx 24rpx; border-radius: 20rpx; padding: 28rpx;
}

.section-title {
  font-size: 30rpx; font-weight: bold; color: $text; margin-bottom: 20rpx; display: block;
}

.section-title-bar {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx;
  .section-title { margin-bottom: 0; }
}

.section-hint { font-size: 22rpx; color: $text-hint; }

// ===== 身份认证 =====
.auth-unverified {
  display: flex; flex-direction: column; align-items: center; gap: 14rpx;
  padding: 0;
}

.auth-unverified-text { font-size: 26rpx; color: #333; font-weight: 400; }

.auth-remind-btn {
  display: flex; align-items: center; justify-content: center;
  width: 50%; padding: 20rpx 0;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA3); border-radius: 48rpx;
}

.auth-remind-btn text { font-size: 28rpx; color: #fff; font-weight: 500; }

.auth-scroll { white-space: nowrap; }

.auth-items { display: flex; gap: 40rpx; padding: 8rpx 0; }

.auth-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; flex-shrink: 0; }

.auth-circle {
  width: 72rpx; height: 72rpx; border-radius: 50%; background: #E8E8E8;
  display: flex; align-items: center; justify-content: center; font-size: 30rpx; color: #999;
  &.on { background: #4A90E2; color: #fff; }
}

.auth-name { font-size: 22rpx; color: $text-hint; }

// ===== 关于我 =====
.about-tags-grid {
  display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 22rpx;
  justify-content: flex-start;
}

.about-capsule {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 10rpx 18rpx;
  background: #FFF8FA; border-radius: 28rpx;
  font-size: 22rpx; color: #333;
}

.ai-profile-block, .ai-hope-block {
  background: #FAFAFA; border-radius: 16rpx; padding: 20rpx; margin-top: 6rpx;
}

.ai-label { display: flex; align-items: center; gap: 8rpx; margin-bottom: 10rpx; }

.ai-dot { font-size: 24rpx; }

.ai-label-text { font-size: 22rpx; color: $pink; font-weight: 500; }

.ai-text { font-size: 26rpx; color: $text-secondary; line-height: 1.6; }

.empty-hint { font-size: 24rpx; color: #ccc; text-align: center; padding: 20rpx 0; }

.ai-profile-gen-entry {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 20rpx; padding: 20rpx;
  background: rgba($pink, 0.05); border: 1rpx solid rgba($pink, 0.2); border-radius: 16rpx;
}

.gen-entry-text { font-size: 26rpx; color: $pink; font-weight: 500; }

.gen-entry-arrow { font-size: 28rpx; color: $pink; }

// ===== AI入口卡片 =====
.ai-entry-card {
  margin: 0 24rpx 16rpx; padding: 24rpx 28rpx;
  background: linear-gradient(135deg, rgba($pink, 0.06), rgba($pink-light, 0.12));
  border: 2rpx solid rgba($pink, 0.35); border-radius: 20rpx;
}

.ai-entry-content { display: flex; align-items: center; gap: 20rpx; }

.ai-entry-emoji { font-size: 40rpx; }

.ai-entry-info { flex: 1; }

.ai-entry-title { font-size: 30rpx; font-weight: bold; color: $pink; }

.ai-entry-desc { font-size: 24rpx; color: $text-hint; margin-top: 4rpx; }

.ai-entry-arrow { font-size: 36rpx; color: $pink; }

// ===== Ta希望你 =====
.partner-tags-grid {
  display: flex; flex-wrap: wrap; gap: 18rpx; margin-bottom: 22rpx;
}

.partner-capsule {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 10rpx 18rpx;
  background: #F0F8FF; border-radius: 28rpx;
}

.pt-value { font-size: 22rpx; color: #333; font-weight: 500; }

// ===== 爱情语录 =====
.love-quote-card {
  .section-title { color: $pink; }
}

.love-quote-text {
  font-size: 28rpx; color: $text; line-height: 1.8; margin-top: 8rpx;
  padding: 24rpx; background: #FFF0F5; border-radius: 16rpx;
}

// ===== Ta的问答（微信聊天风格） =====
.qa-card {
  .section-title { margin-bottom: 24rpx; }
}

.qa-item { margin-bottom: 32rpx; }

.qa-row {
  display: flex; align-items: flex-start; margin-bottom: 12rpx;
}

.qa-question-row { justify-content: flex-start; }

.qa-answer-row { justify-content: flex-end; }

.qa-avatar {
  width: 64rpx; height: 64rpx; border-radius: 50%; flex-shrink: 0;
}

.qa-question-avatar {
  background: linear-gradient(135deg, #FF8A9E, #FFB3C1);
  display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; margin-right: 12rpx;
}

.qa-user-avatar { margin-left: 12rpx; }

.qa-bubble {
  max-width: 70%; padding: 18rpx 24rpx; border-radius: 20rpx;
  font-size: 26rpx; color: $text; line-height: 1.6;
}

.qa-bubble-question {
  background: #F0F0F0; border-top-left-radius: 6rpx;
}

.qa-bubble-answer {
  background: #A8E6A1; border-top-right-radius: 6rpx;
}

// ===== 介绍给好友（白色胶囊按钮） =====
.share-capsule {
  display: flex; align-items: center; justify-content: center;
  margin: 16rpx auto; padding: 22rpx 48rpx;
  background: #fff; border-radius: 48rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  width: fit-content;
}

.capsule-text { font-size: 28rpx; color: $text; font-weight: 400; }

// ===== 举报 / 拉黑 =====
.report-block-row {
  display: flex; justify-content: center; align-items: center; gap: 16rpx;
  padding: 16rpx 0;
}

.report-link {
  font-size: 26rpx; color: $text-hint; padding: 8rpx;
}

.report-divider { font-size: 24rpx; color: #ddd; }

// ===== 底部空白 =====
.bottom-spacer { height: 160rpx; }

// ===== 底部悬浮按钮（固定，无卡片背景） =====
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
  display: flex; justify-content: center; gap: 20rpx; padding: 16rpx 40rpx;
  /* 无背景、无阴影，纯悬浮 */
}

.bb-btn {
  height: 88rpx; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 44rpx; font-size: 30rpx; font-weight: 400; color: #fff;
  padding: 0 48rpx; flex-shrink: 0;
}

.contact-btn { background: linear-gradient(135deg, $pink, #FF758C); }

.matchmaker-btn { background: linear-gradient(135deg, $purple, #A78BFA); }

// ===== 订阅弹窗 & 拉黑确认弹窗 =====
.dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;
}

.dialog-card {
  width: 580rpx; background: #fff; border-radius: 24rpx; padding: 44rpx 36rpx 32rpx;
  display: flex; flex-direction: column; align-items: center;
}

.dialog-title {
  font-size: 32rpx; font-weight: bold; color: $text; text-align: center; margin-bottom: 12rpx;
}

.dialog-desc {
  font-size: 28rpx; color: $text-secondary; text-align: center; line-height: 1.6;
  margin-bottom: 32rpx; white-space: pre-line;
}

.dialog-buttons {
  display: flex; gap: 24rpx; width: 100%; margin-bottom: 24rpx;
}

.dialog-btn {
  flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 40rpx; font-size: 30rpx; font-weight: 500;
}

.cancel-btn { background: #F5F5F5; color: $text-secondary; }

.allow-btn { background: #07C160; color: #fff; }

.block-confirm-btn { background: #07C160; }

.dialog-check-label {
  display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: $text-hint;
}

// ===== 举报底部弹窗 =====
.report-sheet-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9998;
  background: rgba(0, 0, 0, 0.45); display: flex; align-items: flex-end;
}

.report-sheet {
  width: 100%; max-height: 85vh; background: #fff5f5;
  border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  overflow-y: auto;
  &.sheet-up { transform: translateY(0); }
}

.report-header {
  display: flex; align-items: center; justify-content: center; position: relative;
  padding: 36rpx 32rpx 20rpx; flex-shrink: 0;
}

.report-title { font-size: 34rpx; font-weight: bold; color: #333; }

.report-close {
  position: absolute; right: 32rpx; top: 50%; transform: translateY(-50%);
  width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: rgba(0, 0, 0, 0.05); font-size: 28rpx; color: #999;
}

.report-tags {
  display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 32rpx 24rpx; flex-shrink: 0;
}

.report-tag {
  padding: 14rpx 28rpx; border-radius: 32rpx;
  background: #fff; border: 2rpx solid #e8e8e8;
  font-size: 26rpx; color: $text-secondary;
  &.tag-selected { background: #FFE8EC; border-color: $pink; color: $pink; }
}

.report-content-section {
  padding: 0 32rpx 24rpx; flex-shrink: 0;
}

.textarea-wrap {
  position: relative; background: #fff; border-radius: 12rpx; padding: 20rpx;
}

.report-textarea {
  width: 100%; min-height: 200rpx; font-size: 28rpx; line-height: 1.6;
  color: #333; box-sizing: border-box;
}

.char-count {
  text-align: right; font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; padding-right: 4rpx;
}

.report-image-section {
  padding: 0 32rpx 24rpx; flex-shrink: 0;
}

.image-section-title {
  font-size: 28rpx; color: #333; font-weight: 500; display: block; margin-bottom: 16rpx;
}

.image-list {
  display: flex; flex-wrap: wrap; gap: 16rpx;
}

.image-item {
  position: relative; width: 156rpx; height: 156rpx; border-radius: 12rpx;
  overflow: hidden; background: #f5f5f5;
}

.image-thumb { width: 100%; height: 100%; }

.image-delete {
  position: absolute; top: -4rpx; right: -4rpx; z-index: 2;
  width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.55); border-radius: 50%; font-size: 22rpx; color: #fff;
}

.image-loading-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center;
  font-size: 22rpx; color: #fff;
}

.image-add-btn {
  width: 156rpx; height: 156rpx; border: 2rpx dashed #ffb3c1; border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center; background: #fff;
}

.add-plus { font-size: 56rpx; color: #ff6b81; line-height: 1; }

.report-submit-area {
  padding: 16rpx 32rpx; flex-shrink: 0;
}

.report-submit-btn {
  height: 96rpx; border-radius: 48rpx;
  background: linear-gradient(135deg, #ff6b81, #ff758c);
  display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; font-weight: bold; color: #fff;
}

// ===== 分享底部弹窗 =====
.share-popup-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9998;
  background: rgba(0, 0, 0, 0.45); display: flex; align-items: flex-end;
}

.share-popup-sheet {
  width: 100%; background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  &.sheet-up { transform: translateY(0); }
}

.share-popup-handle {
  width: 60rpx; height: 8rpx; background: #ddd; border-radius: 4rpx;
  margin: 20rpx auto 28rpx;
}

.share-popup-options {
  display: flex; justify-content: center; gap: 120rpx; padding: 20rpx 48rpx 48rpx;
}

.share-option {
  display: flex; flex-direction: column; align-items: center;
  padding: 0; margin: 0; border: none; background: transparent;
  &::after { border: none; }
}

.share-option-label { font-size: 28rpx; color: #333; font-weight: 500; line-height: 1; }

// ===== 分隔线 + 拼接文案 =====
.section-divider {
  height: 1rpx; background: #e8e8e8; margin: 22rpx 0 18rpx;
}

.character-line-wrap, .hope-line-wrap {
  margin-top: 4rpx;
}

.character-line, .hope-line {
  font-size: 26rpx; color: #333; line-height: 1.6;
}

// ===== 照片引导（hero 区） =====
.hero-blur { filter: blur(12px); }

.hero-blur-prompt {
  position: absolute; inset: 0; z-index: 5;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx;
}

.blur-prompt-text {
  font-size: 28rpx; color: #fff; text-align: center;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.4); padding: 0 48rpx; line-height: 1.5;
}

.blur-prompt-btn {
  display: flex; align-items: center; justify-content: center;
  width: 320rpx; height: 80rpx; border-radius: 999px;
  background: linear-gradient(135deg, $pink, #FF8E9E);
  font-size: 28rpx; color: #fff; font-weight: bold;
  box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.4);
}

// ===== AI趣味测试弹窗 =====
.funquiz-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.45); display: flex; align-items: flex-end;
}

.funquiz-panel {
  width: 100%; max-height: 80vh; background: linear-gradient(180deg, #FFF0F5 0%, #FFF8FA 100%);
  border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; box-sizing: border-box;
}

.funquiz-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx 32rpx 20rpx; flex-shrink: 0;
}

.funquiz-title { font-size: 34rpx; font-weight: bold; color: #1A1A1A; }

.funquiz-close {
  width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F5F5;
  display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999;
}

.funquiz-body { flex: 1; overflow-y: auto; box-sizing: border-box; }

.funquiz-body-inner { padding: 0 32rpx 24rpx; }

.funquiz-result-body { overflow-y: auto; }

.funquiz-desc {
  font-size: 26rpx; color: #666; line-height: 1.6; margin-bottom: 32rpx; display: block;
}

.funquiz-field { margin-bottom: 24rpx; }

.funquiz-label { font-size: 26rpx; color: #333; margin-bottom: 10rpx; display: block; }

.funquiz-picker {
  padding: 20rpx 24rpx; background: #F5F5F5; border-radius: 12rpx; font-size: 28rpx; color: #333;
}

.funquiz-btn {
  display: flex; align-items: center; justify-content: center;
  height: 96rpx; border-radius: 999px;
  background: linear-gradient(135deg, $pink, $pink-light);
  font-size: 30rpx; color: #fff; font-weight: bold;
  width: 100%; box-sizing: border-box;
  &.disabled { opacity: 0.5; }
}

.funquiz-retry-btn { background: linear-gradient(135deg, $pink, $pink-light); color: #fff; }

.funquiz-footer {
  padding: 16rpx 32rpx 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #FFE4E9; flex-shrink: 0; background: #fff;
}

.fq-result-header { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 20rpx 0 28rpx; }

.fq-zodiac { font-size: 26rpx; color: #666; }

.fq-vs { font-size: 32rpx; flex-shrink: 0; }

.fq-keywords { display: flex; flex-wrap: wrap; justify-content: center; gap: 16rpx; padding-bottom: 28rpx; }

.fq-keyword {
  padding: 10rpx 24rpx; border-radius: 28rpx;
  background: linear-gradient(135deg, #FFF0F3, #FFE8EC); font-size: 24rpx; color: $pink;
}

.fq-section { padding-bottom: 24rpx; }

.fq-section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 10rpx; display: block; }

.fq-section-text { font-size: 26rpx; color: #666; line-height: 1.7; }

.fq-node { padding: 16rpx 20rpx; background: #FFF5F7; border-radius: 12rpx; margin-bottom: 12rpx; }

.fq-node-day { font-size: 24rpx; color: $pink; font-weight: bold; margin-bottom: 4rpx; display: block; }

.fq-node-title { font-size: 26rpx; color: #333; margin-bottom: 4rpx; display: block; }

.fq-node-desc { font-size: 24rpx; color: #999; }

.fq-disclaimer { font-size: 22rpx; color: #CCC; text-align: center; padding: 20rpx 0; }
</style>

