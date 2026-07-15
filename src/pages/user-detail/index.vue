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
          <text class="frost-nickname">{{ profileData.top.displayName || profileData.top.nickname || '用户主页' }}</text>
          <view class="frost-placeholder" />
        </view>
      </view>

      <scroll-view class="page-scroll" scroll-y :enhanced="true" :show-scrollbar="false">
        <!-- ========== 1. 顶部大背景图（50vh，顶部大圆角） ========== -->
        <view class="hero-section" :style="{ paddingTop: frostTotalHeight + 'px' }">
          <image
            v-if="activePhotoUrl"
            class="hero-bg"
            :class="{ 'hero-blur': activePhotoNeedsBlur, 'photo-slide': photoAnimating }"
            :src="activePhotoUrl"
            mode="aspectFill"
          />
          <view v-else class="hero-placeholder" />
          <view class="hero-gradient" />
          <!-- 右上角分享按钮 -->
          <view class="hero-share-btn" :style="{ top: (frostTotalHeight + 10) + 'px' }" @tap="openSharePopup">
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
                :src="getFullImageUrl(photo.url) || defaultAvatar"
                mode="aspectFill"
                :style="(photo.isBlurred || photo.needLogin) ? { filter: 'blur(6px)' } : {}"
              />
            </view>
          </view>
        </view>

        <!-- ========== 2. 白色资料卡片（负 margin 覆盖背景图底部，浮层效果） ========== -->
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
            <view class="info-left">
              <view class="info-name-id">
                <text class="info-nickname">{{ profileData.top.displayName || profileData.top.nickname }}</text>
                <text class="info-id"><text class="id-badge">ID</text>{{ profileData.top.userId }}</text>
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
              <!-- 人格类型标签（该用户已测试时展示，点击查看简化雷达图） -->
              <view v-if="targetPersonality" class="personality-tag" @tap="openPersonalityPopup">
                <text class="pt-icon">🧭</text>
                <text class="pt-text">{{ targetPersonality.nickname || targetPersonality.typeName }}</text>
              </view>
            </view>
            <view v-if="!profileData.top.isSelf" class="follow-wrap" @tap="toggleFollow">
              <view class="follow-btn" :class="{ liked: profileData.top.isFollowed }">
                <!-- 用 Unicode 心形替代 uni-icons 图标字体，避免真机字体不渲染 -->
                <text class="follow-ico">{{ profileData.top.isFollowed ? '♥' : '♡' }}</text>
              </view>
              <text class="follow-text">{{ profileData.top.isFollowed ? '已关注' : '关注' }}</text>
            </view>
          </view>
        </view>

        <!-- ========== 生日星座 + 职业 + 家乡 + 现居 ========== -->
        <view class="info-tags-row">
          <!-- 生日星座 + 职业 同行 -->
          <view class="info-row-two" v-if="profileData.basicInfo.birthDay || profileData.basicInfo.occupation">
            <view v-if="profileData.basicInfo.birthDay" class="info-chip left-chip">
              <image class="chip-icon" src="/static/icons/user-tags/birthday.png" mode="aspectFit" />
              <text>{{ profileData.basicInfo.birthDay }} · {{ profileData.basicInfo.zodiac || '' }}{{ profileData.basicInfo.constellation ? ' · ' + profileData.basicInfo.constellation : '' }}</text>
            </view>
            <view v-if="profileData.basicInfo.occupation" class="info-chip right-chip">
              <image class="chip-icon" src="/static/icons/user-tags/industry.png" mode="aspectFit" />
              <text>{{ profileData.basicInfo.occupation }}</text>
            </view>
          </view>

          <!-- 户籍 + 现居 -->
          <view class="info-row-two" v-if="profileData.basicInfo.hometown || profileData.basicInfo.residence">
            <view v-if="profileData.basicInfo.hometown" class="info-chip loc-chip">
              <image class="loc-tag-icon" src="/static/icons/user-tags/hometown.png" mode="aspectFit" />
              <text>{{ formatCityDistrict(profileData.basicInfo.hometown) }}</text>
            </view>
            <view v-if="profileData.basicInfo.residence" class="info-chip loc-chip">
              <image class="loc-tag-icon" src="/static/icons/user-tags/location.png" mode="aspectFit" />
              <text>{{ formatCityDistrict(profileData.basicInfo.residence) }}</text>
            </view>
          </view>
        </view>

        <!-- ========== 3. 身份认证区 ========== -->
        <view class="section-card">
          <view class="section-title-bar">
            <view class="section-title">
              <view class="auth-title-icon">
                <AppIcon name="icon-shield-check-thin" size="40" color="#333333" />
              </view>
              身份认证
            </view>
            <view class="section-hint">
              <AppIcon name="icon-question-thin" size="28" color="#999999" />
              点亮的为已认证
            </view>
          </view>
          <!-- 认证图标列表（未认证时模糊） -->
          <view class="auth-container" :class="{ 'auth-blur': isRealNameNotVerified }">
            <view class="auth-section">
              <view class="auth-list">
                <view
                  v-for="item in profileData.identityAuth.items"
                  :key="item.type"
                  class="auth-item"
                  @tap="onAuthTap(item)"
                >
                  <view class="auth-icon-wrapper" :class="{ 'auth-verified': item.verified }">
                    <AppIcon
                      :name="getAuthIconName(item.type)"
                      size="36"
                      :color="item.verified ? '#FFFFFF' : '#999999'"
                    />
                  </view>
                  <text class="auth-label">{{ item.label === '单身承诺' ? '单身承\n诺' : item.label }}</text>
                </view>
              </view>
            </view>
            <!-- 未认证覆盖层 -->
            <view v-if="isRealNameNotVerified" class="auth-blur-overlay" @tap.stop>
              <text class="auth-unverified-text">该用户未实名认证</text>
              <view v-if="!isLoggedIn" class="auth-remind-btn" @tap="goToLogin">
                <text>去登录</text>
              </view>
              <view v-else class="auth-remind-btn" @tap="remindVerify">
                <text>提醒对方认证</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ========== 红娘评语 ========== -->
        <view v-if="matchmakerReviewText" class="mk-review-card">
          <view class="mk-review-header">
            <text class="mk-review-title">红娘评语</text>
            <text class="mk-review-dash">——</text>
          </view>
          <view class="mk-review-body">
            <text class="mk-review-text">{{ matchmakerReviewText }}</text>
          </view>
        </view>

        <!-- ========== 4. 关于我区 ========== -->
        <view class="section-card">
          <view class="section-title-row">
            <AppIcon name="icon-scroll-thin" size="32" color="#333333" />
            <text class="section-title">关于我</text>
          </view>
          <view v-if="profileData.aboutMe.tags?.length" class="about-tags-grid">
            <view v-for="tag in profileData.aboutMe.tags" :key="tag.name" class="about-capsule">
              <AppIcon v-if="getAboutTagIcon(tag.name)" :name="getAboutTagIcon(tag.name)" size="28" color="#999999" />
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

        <!-- ========== AI红娘说（双方均已测试人格才展示） ========== -->
        <view v-if="matchAdviceEligible && !profileData.top.isSelf" class="ai-entry-card" @tap="openMatchAdvice">
          <view class="ai-entry-content">
            <text class="ai-entry-emoji">✦</text>
            <view class="ai-entry-info">
              <text class="ai-entry-title">AI红娘说</text>
              <text class="ai-entry-desc">看看你们的性格契合分析</text>
            </view>
            <text class="ai-entry-arrow">→</text>
          </view>
        </view>

        <!-- ========== 浏览者未测试引导（文案由后台配置） ========== -->
        <view v-if="showViewerTestGuide && !profileData.top.isSelf" class="ai-entry-card viewer-guide-card" @tap="goViewerTest">
          <view class="ai-entry-content">
            <text class="ai-entry-emoji">🧭</text>
            <view class="ai-entry-info">
              <text class="ai-entry-title">{{ viewerGuideText }}</text>
              <text class="ai-entry-desc">测完更懂你们的契合度</text>
            </view>
            <text class="ai-entry-arrow">→</text>
          </view>
        </view>

        <!-- ========== 5. Ta希望你区 ========== -->
        <view class="section-card">
          <view class="section-title-row">
            <AppIcon name="icon-calendar-heart-thin" size="32" color="#333333" />
            <text class="section-title">Ta希望你</text>
          </view>

          <!-- 未登录态：提示登录卡片 -->
          <view v-if="!isLoggedIn" class="auth-blur-overlay auth-login-gate" @tap.stop>
            <text class="auth-unverified-text">登录用户可见～</text>
            <view class="auth-remind-btn" @tap="goToLogin">
              <text>去登录</text>
            </view>
          </view>

          <template v-else>
          <view v-if="cleanedPartnerTags.length" class="partner-tags-grid">
            <view v-for="pt in cleanedPartnerTags" :key="pt.label" class="partner-capsule">
              <AppIcon v-if="getPartnerTagIcon(pt.label)" :name="getPartnerTagIcon(pt.label)" size="24" color="#999999" />
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
          </template>
        </view>

        <!-- ========== 6. Ta的问答（无问答时不展示整卡片） ========== -->
        <view v-if="profileData.answers && profileData.answers.length" class="section-card qa-card">
          <text class="section-title">Ta的问答</text>

          <!-- 未登录态：提示登录卡片 -->
          <view v-if="!isLoggedIn" class="auth-blur-overlay auth-login-gate" @tap.stop>
            <text class="auth-unverified-text">登录用户可见～</text>
            <view class="auth-remind-btn" @tap="goToLogin">
              <text>去登录</text>
            </view>
          </view>

          <template v-else>
          <view v-if="profileData.answers?.length">
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
            <!-- 回答按钮 -->
            <view class="qa-answer-btn" @tap="goToAnswer(item)">
              <text>回答</text>
            </view>
          </view>
          </view>
          <view v-else class="empty-hint">
            <text>TA还没回答过问题哦～</text>
          </view>
          </template>
        </view>

        <!-- ========== 7. 爱情语录 ========== -->
        <view v-if="profileData.loveQuote" class="section-card love-quote-card">
          <text class="section-title">Ta的爱情语录</text>
          <text class="love-quote-text">{{ profileData.loveQuote }}</text>
        </view>

        <!-- ========== 7. 介绍给好友 ========== -->
        <view class="share-capsule" @tap="openSharePopup">
          <uni-icons type="redo" size="32rpx" color="#1A1A1A"></uni-icons>
          <text class="capsule-text">介绍给好友</text>
        </view>

        <!-- ========== 7. 举报 / 拉黑 ========== -->
        <view class="report-block-row">
          <text class="report-link" @tap="openReportSheet">举报</text>
          <text class="report-divider">/</text>
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

      <!-- ========== 对方未实名认证提示弹窗 ========== -->
      <view v-if="showRealNameDialog" class="dialog-overlay" @tap="showRealNameDialog = false">
        <view class="dialog-card" @tap.stop>
          <text class="dialog-title">提示</text>
          <text class="dialog-desc">对方未实名认证，确认继续查看？</text>
          <view class="dialog-buttons">
            <view class="dialog-btn cancel-btn" @tap="showRealNameDialog = false">
              <text>取消</text>
            </view>
            <view class="dialog-btn allow-btn" @tap="showRealNameDialog = false; navigateToContactApply()">
              <text>确认</text>
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
              :key="reason.value"
              class="report-tag"
              :class="{ 'tag-selected': selectedReportReasons.includes(reason.value) }"
              @tap="toggleReportReason(reason.value)"
            >
              <text>{{ reason.label }}</text>
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

      <!-- ========== AI红娘说弹窗 ========== -->
      <view v-if="showMatchAdvicePopup" class="funquiz-overlay" @tap="showMatchAdvicePopup = false">
        <view class="funquiz-panel" @tap.stop>
          <view class="funquiz-header">
            <text class="funquiz-title">AI红娘说</text>
            <view class="funquiz-close" @tap="showMatchAdvicePopup = false"><text>✕</text></view>
          </view>
          <scroll-view class="funquiz-body funquiz-result-body" scroll-y :enhanced="true" :show-scrollbar="false">
            <view class="funquiz-body-inner">
              <view v-if="matchAdviceLoading" class="ma-loading">
                <text class="ma-loading-text">AI 红娘正在分析你们的性格契合…</text>
              </view>
              <block v-else-if="matchAdvice">
                <view class="fq-section">
                  <text class="fq-section-title">性格互补点</text>
                  <text class="fq-section-text">{{ matchAdvice.complement }}</text>
                </view>
                <view class="fq-section">
                  <text class="fq-section-title">潜在摩擦点</text>
                  <text class="fq-section-text">{{ matchAdvice.friction }}</text>
                </view>
                <view class="fq-section">
                  <text class="fq-section-title">破冰话题推荐</text>
                  <text v-for="(t, i) in matchAdvice.icebreakers" :key="'ib' + i" class="ma-list-item">{{ Number(i) + 1 }}. {{ t }}</text>
                </view>
                <view class="fq-section">
                  <text class="fq-section-title">约会场景建议</text>
                  <text v-for="(d, i) in matchAdvice.dateScenes" :key="'ds' + i" class="ma-list-item">· {{ d }}</text>
                </view>
                <text class="ma-disclaimer">{{ matchAdvice.disclaimer || '内容由 AI 生成，仅供参考' }}</text>
              </block>
              <view v-else class="ma-loading">
                <text class="ma-loading-text">暂无法生成分析，请稍后重试</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- ========== 人格类型弹窗（简化雷达图 + 适配建议） ========== -->
      <view v-if="showPersonalityPopup" class="funquiz-overlay" @tap="showPersonalityPopup = false">
        <view class="funquiz-panel" @tap.stop>
          <view class="funquiz-header">
            <text class="funquiz-title">TA 的性格画像</text>
            <view class="funquiz-close" @tap="showPersonalityPopup = false"><text>✕</text></view>
          </view>
          <scroll-view class="funquiz-body funquiz-result-body" scroll-y :enhanced="true" :show-scrollbar="false">
            <view class="funquiz-body-inner" v-if="targetPersonality">
              <view class="pp-head">
                <text class="pp-name">{{ targetPersonality.typeName || targetPersonality.typeCode }}</text>
                <text v-if="targetPersonality.nickname" class="pp-nick">「{{ targetPersonality.nickname }}」</text>
              </view>
              <view class="pp-radar-wrap">
                <canvas canvas-id="ppRadar" id="ppRadar" class="pp-radar" />
              </view>
              <view v-if="targetPersonality.tags && targetPersonality.tags.length" class="pp-tags">
                <text v-for="(t, i) in targetPersonality.tags" :key="'pt' + i" class="pp-tag">{{ t }}</text>
              </view>
              <view class="pp-advice">
                <text class="pp-advice-title">适配建议</text>
                <text class="pp-advice-text">{{ personalityAdviceText }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

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
              <AppIcon class="share-option-icon" name="icon-wechat-logo-thin" size="56" color="#333333" />
              <text class="share-option-label">分享给好友</text>
            </button>
            <view class="share-option" @tap="generatePoster">
              <AppIcon class="share-option-icon" name="icon-download-simple-thin" size="56" color="#333333" />
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
    const displayName = page?.profileData?.top?.displayName || page?.profileData?.top?.nickname || ''
    return {
      title: `${displayName}的个人主页`,
      path: `/pages/user-detail/index?id=${page?.userId || 0}`,
      imageUrl: page?.profileData?.top?.avatar || '',
    }
  },
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { resolveAndExposeCopy, reportCopyClick } from '@/utils/personality'
import { getFullImageUrl } from '@/utils/common'
import { uploadImage } from '@/utils/upload'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { icons } from '@/config/icons'
import { logger } from '@/utils/logger'
import matchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import matchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import aiMatchPopup from '@/components/ai-match-popup/ai-match-popup.vue'
import { safeNavigateBack } from '@/utils/navigate'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const userStore = useUserStore()
const systemStore = useSystemStore()
const defaultAvatar = computed(() => systemStore.defaultAvatar || icons.common.defaultAvatar)

const userId = ref(0)
const loading = ref(true)
const profileData = ref<any>(null)

// ===== 语音 =====
const voiceEnabled = ref(true)
const voiceData = ref<{ voiceUrl: string; duration: number; auditStatus: number } | null>(null)
const isVoicePlaying = ref(false)
let voiceAudioCtx: ReturnType<typeof uni.createInnerAudioContext> | null = null
const showAiMatchPopup = ref(false)
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])
const followLoading = ref(false)

// ===== 照片 =====
const activePhotoIndex = ref(0)
const photoAnimating = ref(false)
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
  return tags
    .filter((t: any) => t.label !== '子女情况')
    .map((t: any) => {
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
// frost 卡片总高度（px）：statusBarHeight + frost-inner 的 88rpx 转为 px
const frostTotalHeight = computed(() => {
  const sysInfo = uni.getSystemInfoSync()
  const statusBarH = sysInfo.statusBarHeight || 44
  const screenWidth = sysInfo.screenWidth || 390
  const rpxRatio = screenWidth / 750
  const frostInnerPx = 88 * rpxRatio // 88rpx → px
  return statusBarH + frostInnerPx
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
const reportReasons = [
  { label: '其他', value: 'other' },
  { label: '色情相关', value: 'porn' },
  { label: '头像/资料虚假', value: 'fake_info' },
  { label: '酒托/饭托', value: 'fraud' },
  { label: '诈骗钱财', value: 'fraud' },
]
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
  // 真机上直接播放远程 URL 可能失败，先下载到本地再播放
  uni.downloadFile({
    url: voiceData.value.voiceUrl,
    success: (res: any) => {
      if (res.statusCode === 200) {
        if (!voiceAudioCtx) {
          voiceAudioCtx = uni.createInnerAudioContext()
          voiceAudioCtx.onEnded(() => { isVoicePlaying.value = false })
          voiceAudioCtx.onError((err: any) => {
            console.error('[UserDetail] voice play error', JSON.stringify(err))
            isVoicePlaying.value = false
          })
        }
        voiceAudioCtx.src = res.tempFilePath
        voiceAudioCtx.play()
        isVoicePlaying.value = true
      }
    },
    fail: (err: any) => {
      console.error('[UserDetail] download voice error', JSON.stringify(err))
    },
  })
}

function stopVoice() {
  if (voiceAudioCtx) {
    voiceAudioCtx.stop()
  }
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
  } else if (opts.scene) {
    // 扫描海报小程序码进入：scene 形如 "id=123"（微信会 URL 编码）
    const scene = decodeURIComponent(opts.scene)
    const m = scene.match(/id=(\d+)/)
    if (m) {
      userId.value = parseInt(m[1])
      fetchProfileDetail()
    } else {
      loading.value = false
    }
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
      profileData.value.top.avatar = getFullImageUrl(profileData.value.top.avatar) || defaultAvatar.value
      profileData.value.top.backgroundPhoto = getFullImageUrl(profileData.value.top.backgroundPhoto) || ''
    }
    // 检查是否已拉黑
    if (isLoggedIn.value) {
      checkBlockStatus()
    }
    // 检查 AI红娘说 入口是否可展示（双方均已测试人格）
    checkMatchAdviceEligibility()
    // 加载人格标签 + 浏览者未测引导
    loadPersonalityInfo()
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
      { id: 1, name: '小红娘', avatar: defaultAvatar.value, title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
    ]
  }
}

const handleBack = () => safeNavigateBack()

const onPhotoTap = (index: number) => {
  const photo = profileData.value?.photos?.[index]
  if (!photo) return
  if (index !== activePhotoIndex.value) {
    photoAnimating.value = true
    setTimeout(() => { photoAnimating.value = false }, 350)
  }
  activePhotoIndex.value = index
}

const handleUploadPhoto = () => {
  uni.navigateTo({ url: '/pages/edit-profile/index' })
}

const onAuthTap = (item: any) => {
  uni.showModal({ title: item.label, content: item.verified ? '已认证' : '未认证', showCancel: false })
}

// ===== 认证类型 → AppIcon name 映射 =====
const AUTH_ICON_MAP: Record<string, string> = {
  real_name: 'icon-identification-badge-thin',
  education: 'icon-graduation-cap-thin',
  house: 'icon-house-line-thin',
  car: 'icon-car-thin',
  single: 'icon-heartbeat-thin',
  single_pro: 'icon-heartbeat-thin',
  single_proof: 'icon-heartbeat-thin',
  single_commit: 'icon-heartbeat-thin',
  marriage: 'icon-list-heart-thin',
  marriage_status: 'icon-list-heart-thin',
  marital: 'icon-list-heart-thin',
  marital_status: 'icon-list-heart-thin',
  relationship: 'icon-list-heart-thin',
}

const getAuthIconName = (type: string): string => {
  return AUTH_ICON_MAP[type] || 'icon-identification-badge-thin'
}

// ===== 关于我标签 → AppIcon name 映射 =====
const HOUSING_VALUES = ['已购房', '已购房（无贷款）', '已购房（有贷款）', '租房', '与父母同住', '单位宿舍', '其他']
const CAR_VALUES = ['已购车', '未购车', '计划购车']
const MARITAL_VALUES = ['未婚', '离异', '离异未育', '离异带孩', '丧偶', '已婚']
const ONLY_CHILD_VALUES = ['独生', '非独生']
const WHEN_MARRY_VALUES = ['闪婚', '一年内', '两年内', '三年内', '时机成熟就结婚', '顺其自然']

const getAboutTagIcon = (name: string): string => {
  if (!name) return ''
  if (name.startsWith('月收入')) return 'icon-currency-jpy-thin'
  if (HOUSING_VALUES.includes(name)) return 'icon-house-line-thin'
  if (CAR_VALUES.includes(name)) return 'icon-car-thin'
  if (MARITAL_VALUES.includes(name)) return 'icon-list-heart-thin'
  if (ONLY_CHILD_VALUES.includes(name)) return 'icon-identification-badge-thin'
  if (WHEN_MARRY_VALUES.includes(name)) return 'icon-heartbeat-thin'
  return ''
}

// ===== Ta希望你区域标签图标映射 =====
const getPartnerTagIcon = (label: string): string => {
  if (!label) return ''
  if (label === '年龄范围') return 'icon-cake-thin'
  if (label === '身高要求') return 'icon-ruler-thin'
  if (label === '学历要求') return 'icon-identification-badge-thin'
  if (label === '收入要求') return 'icon-currency-jpy-thin'
  if (label === '婚况要求') return 'icon-list-heart-thin'
  return ''
}

// ===== 是否未实名认证 =====
const isRealNameNotVerified = computed(() => {
  const items = profileData.value?.identityAuth?.items
  if (!items) return true
  const realName = items.find((i: any) => i.type === 'real_name')
  return !realName?.verified
})

// ===== 提醒对方认证 =====
const goToLogin = () => {
  const params = `from=detail&userId=${userId.value}`
  uni.navigateTo({ url: `/pages/login/index?${params}` })
}

const goToAnswer = (item: any) => {
  const questionId = item.id || item.questionId
  const title = encodeURIComponent(item.question || '')
  uni.navigateTo({ url: `/pages/answer/index?questionId=${questionId}&title=${title}` })
}

const remindVerify = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  uni.showToast({ title: '已发送提醒', icon: 'success' })
}

// ===== 关注 / 取消关注 =====
const toggleFollow = async () => {
  if (!isLoggedIn.value) {
    goToLogin()
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
  // 只要点击允许，就全局不再弹窗
  uni.setStorageSync('subscribe_always_allow', true)
}

// ===== 拉黑 =====
const confirmBlock = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
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
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
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
  if (!isLoggedIn.value) {
    // 举报未登录特殊处理：显示 loading 蒙层 + "您还未登录" 1.5s 后跳转
    uni.showLoading({ title: '您还未登录', mask: true })
    setTimeout(() => {
      uni.hideLoading()
      goToLogin()
    }, 1500)
    return
  }
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
      url: '/users/reports',
      method: 'POST',
      data: {
        targetId: userId.value,
        type: 'user',
        reason: selectedReportReasons.value[0] || 'other',
        description: reportContent.value.trim() || undefined,
        evidence: imageUrls.join(',') || undefined,
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
    goToLogin()
    return
  }
  showAiMatchPopup.value = true
}

// ===== AI红娘说（双方均已测试人格才展示） =====
const matchAdviceEligible = ref(false)
const showMatchAdvicePopup = ref(false)
const matchAdviceLoading = ref(false)
const matchAdvice = ref<any>(null)

// 检查是否可展示入口：功能开启 + 双方均已测试（后端判定，未满足则隐藏）
const checkMatchAdviceEligibility = async () => {
  matchAdviceEligible.value = false
  if (!isLoggedIn.value || !userId.value || profileData.value?.top?.isSelf) return
  try {
    const res: any = await request({
      url: `/ai/personality/match-advice/eligibility?targetUserId=${userId.value}`,
      method: 'GET',
    })
    matchAdviceEligible.value = !!res?.eligible
  } catch { /* 静默：不展示入口 */ }
}

const openMatchAdvice = async () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  showMatchAdvicePopup.value = true
  if (matchAdvice.value || matchAdviceLoading.value) return
  matchAdviceLoading.value = true
  try {
    const res: any = await request({
      url: `/ai/personality/match-advice?targetUserId=${userId.value}`,
      method: 'GET',
    })
    matchAdvice.value = res || null
  } catch (e: any) {
    uni.showToast({ title: e?.message || '生成失败，请稍后重试', icon: 'none' })
  } finally {
    matchAdviceLoading.value = false
  }
}

// ===== 人格类型标签 + 弹窗 + 浏览者未测引导 =====
const instance = getCurrentInstance()
const targetPersonality = ref<any>(null)      // 被浏览用户的简化人格视图
const showPersonalityPopup = ref(false)
const viewerTested = ref(false)                // 浏览者本人是否已测
const viewerGuideText = ref('测一测')
const viewerGuideItemId = ref<number | undefined>(undefined)
// 浏览者本人未测试即展示引导（不依赖对方是否已测，符合需求6）
const showViewerTestGuide = computed(() => !viewerTested.value)
const personalityAdviceText = computed(() => {
  const name = targetPersonality.value?.nickname || targetPersonality.value?.typeName || 'TA'
  return `${name}的性格与你的互补度较高，建议尝试从共同话题切入，慢慢了解彼此。`
})

// 红娘评语：合并所有评语内容作为纯文本展示
const matchmakerReviewText = computed(() => {
  const reviews = profileData.value?.matchmakerReviews
  if (!reviews?.length) return ''
  // 存在多条时只展示最新一条（后端按 createdAt DESC 排序，取首条）
  return reviews[0]?.content || ''
})

// 加载对方人格 + 浏览者自身测试状态（在资料加载后调用）
const loadPersonalityInfo = async () => {
  if (!userId.value || profileData.value?.top?.isSelf) return
  // 对方人格（简化视图，未测返回 null）
  try {
    const res: any = await request({
      url: `/personality/result/user/${userId.value}`,
      method: 'GET',
    })
    targetPersonality.value = res && res.typeCode ? res : null
  } catch { targetPersonality.value = null }
  // 浏览者自身是否已测
  if (isLoggedIn.value) {
    try {
      const mine: any = await request({ url: '/personality/my-result', method: 'GET' })
      viewerTested.value = !!(mine && mine.typeCode)
    } catch { viewerTested.value = false }
  } else {
    viewerTested.value = false
  }
  // 浏览者未测时曝光引导文案位（后台可配置文案）
  if (showViewerTestGuide.value) {
    const copy = await resolveAndExposeCopy('user_detail_test_guide')
    if (copy?.mainText) viewerGuideText.value = copy.mainText
    viewerGuideItemId.value = copy?.itemId
  }
}

const openPersonalityPopup = () => {
  if (!targetPersonality.value) return
  showPersonalityPopup.value = true
  nextTick(() => setTimeout(drawTargetRadar, 60))
}

const goViewerTest = () => {
  reportCopyClick('user_detail_test_guide', viewerGuideItemId.value)
  if (!isLoggedIn.value) { goToLogin(); return }
  uni.navigateTo({ url: '/pages/personality/test' })
}

// 绘制对方简化雷达图（radar: { 维度code: 0-100 }）
const drawTargetRadar = () => {
  const radar = targetPersonality.value?.radar || {}
  const keys = Object.keys(radar)
  if (keys.length === 0) return
  const ctx = uni.createCanvasContext('ppRadar', instance?.proxy)
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 36
  const n = keys.length
  const angleStep = (Math.PI * 2) / n
  const start = -Math.PI / 2

  ctx.clearRect(0, 0, size, size)
  ctx.setStrokeStyle('#ffd6e4')
  ctx.setLineWidth(1)
  for (let layer = 1; layer <= 3; layer++) {
    const r = (radius * layer) / 3
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const ang = start + angleStep * i
      const x = cx + r * Math.cos(ang)
      const y = cy + r * Math.sin(ang)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  for (let i = 0; i < n; i++) {
    const ang = start + angleStep * i
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + radius * Math.cos(ang), cy + radius * Math.sin(ang))
    ctx.stroke()
  }
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const ang = start + angleStep * i
    const v = Math.max(0, Math.min(100, Number(radar[keys[i]]) || 0)) / 100
    const r = radius * v
    const x = cx + r * Math.cos(ang)
    const y = cy + r * Math.sin(ang)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.setFillStyle('rgba(255,107,157,0.35)')
  ctx.fill()
  ctx.setStrokeStyle('#ff6b9d')
  ctx.setLineWidth(2)
  ctx.stroke()
  ctx.draw()
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
    goToLogin()
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

// ===== 对方未实名认证提示弹窗 =====
const showRealNameDialog = ref(false)

const handleContact = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  // 检查目标用户是否实名认证
  if (isRealNameNotVerified.value) {
    showRealNameDialog.value = true
    return
  }
  navigateToContactApply()
}

const navigateToContactApply = () => {
  const p = profileData.value
  const top = p?.top || {}
  const basic = p?.basicInfo || {}
  const params = [
    `userId=${userId.value}`,
    `nickname=${encodeURIComponent(top.displayName || top.nickname || '')}`,
    `avatar=${encodeURIComponent(top.avatar || '')}`,
    `isRealName=${isRealNameNotVerified.value ? '0' : '1'}`,
    `age=${basic.age || ''}`,
    `height=${basic.height || ''}`,
    `weight=${basic.weight || ''}`,
    `education=${encodeURIComponent(basic.education || '')}`,
    `occupation=${encodeURIComponent(basic.occupation || '')}`,
  ].join('&')
  uni.navigateTo({ url: `/pages/contact-apply/index?${params}` })
}

const showMatchmakerPopup = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  if (!matchmakerList.value.length) {
    matchmakerList.value = [{ id: 1, name: '小红娘', avatar: defaultAvatar.value, title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' }]
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

onUnmounted(() => {
  if (voiceAudioCtx) {
    voiceAudioCtx.stop()
    voiceAudioCtx.destroy()
    voiceAudioCtx = null
  }
})
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;
$purple: #7C3AED;
$bg: #FAFAFA;
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

// ===== 1. 顶部大背景图（50vh，顶部大圆角） =====
.hero-section {
  position: relative; width: 100%; height: 50vh; overflow: hidden;
  border-radius: 33rpx 33rpx 0 0; box-sizing: border-box;
}

.hero-bg {
  width: 100%; height: 100%;
  border-radius: 33rpx 33rpx 0 0;
}

.hero-bg.photo-slide {
  animation: photoSlideIn 350ms ease;
}

@keyframes photoSlideIn {
  0% { transform: translateX(30%); opacity: 0.6; }
  100% { transform: translateX(0); opacity: 1; }
}

.hero-placeholder {
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-gradient {
  position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.45));
}

// ===== 右上角分享按钮（hero-section 内绝对定位） =====
.hero-share-btn {
  position: absolute; right: 24rpx; z-index: 20;
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center;
}

// ===== 照片缩略图：叠放在背景图底部（卡片上方） =====
.hero-thumbnails {
  position: absolute; bottom: 62rpx; left: 24rpx; right: 24rpx; z-index: 10;
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

// ===== 2. 白色资料卡片（微覆盖背景图 4rpx，顶部大圆角浮层） =====
.info-card {
  background: $card-bg; border-radius: 33rpx 33rpx 0 0;
  margin: -36rpx 0 0; padding: 34rpx 28rpx 20rpx;
  position: relative; z-index: 10;
}

.info-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 16rpx;
}

.info-left {
  display: flex; flex-direction: column; flex: 1; min-width: 0;
  padding-top: 32rpx;
}

.info-name-id {
  display: flex; align-items: flex-start; gap: 10rpx; flex: 1; min-width: 0;
}

.info-nickname {
  font-size: 36rpx; font-weight: bold; color: $text; line-height: 1;
}

.id-badge {
  display: inline-block;
  font-style: italic;
  font-size: 26rpx;
  font-weight: 500; color: #fff; background-color: #aaa;
  padding: 0 7rpx; border-radius: 20rpx; line-height: 1.2;
  vertical-align: baseline; margin-right: 4rpx;
}

.info-id {
  font-size: 28rpx; color: $text-hint; padding-top: 0rpx; font-weight: 400;
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

.follow-ico {
  font-size: 40rpx; line-height: 1; color: #FF6B6B;
}

.follow-btn.liked {
  animation: heartBounce 300ms ease;
}

@keyframes heartBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

// ===== 生日星座 + 职业 + 家乡 + 现居（info-card 外） =====
.info-tags-row {
  padding: 16rpx 28rpx 16rpx;
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

.chip-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.loc-chip {
  background: #F0F0F0; color: $text;
  gap: 4rpx;
}

.loc-tag-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
}

// ===== 基本资料 =====
.basic-line {
  display: flex; align-items: baseline; flex-wrap: wrap;
  font-size: 26rpx; color: #333; margin-bottom: 0;
  margin-top: 14rpx;
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
  background: $card-bg; margin: 16rpx 24rpx; border-radius: 20rpx; padding: 8rpx 16rpx 24rpx;
}

.section-title {
  font-size: 30rpx; font-weight: 500; color: $text; margin-bottom: 20rpx; display: block;
}

.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;

  .section-title {
    margin-bottom: 0;
    margin-left: 12rpx;
  }
}

.section-title-bar {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 48rpx;
  .section-title { margin-bottom: 0; display: flex; align-items: center; }
}

.section-hint { font-size: 22rpx; color: $text-hint; display: flex; align-items: center; }

.auth-title-icon {
  margin-right: 12rpx;
  display: flex;
  align-items: center;
}

// ===== 身份认证 =====
// ===== 认证容器（未认证时模糊） =====
.auth-container { position: relative; }

.auth-blur .auth-section {
  filter: blur(4px);
}

.auth-section {
  width: 100%;
  padding: 0 0;
  box-sizing: border-box;
}

.auth-list {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: flex-start;
  padding: 0 0;
  width: 100%;
}

.auth-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100rpx;
  flex-shrink: 0;
}

.auth-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F5F5F5;
  margin-bottom: 16rpx;

  &.auth-verified {
    background-color: #4A90D9;
  }
}

.auth-label {
  font-size: 22rpx;
  color: #666666;
  text-align: center;
  width: 100rpx;
  line-height: 1.3;
}

.auth-blur-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14rpx; z-index: 5;
  background: rgba(255, 255, 255, 0.4);
  padding-bottom: 80rpx;  // 整体上移，平衡上下留白
}

// 登录拦截卡片（独立显示，非覆盖层）
.auth-login-gate {
  position: relative; top: auto; left: auto; right: auto; bottom: auto;
  padding: 48rpx 0; background: rgba(255, 255, 255, 0.6);
}

.auth-unverified-text { font-size: 26rpx; color: #333; font-weight: 400; }

.auth-remind-btn {
  display: flex; align-items: center; justify-content: center;
  width: auto; padding: 14rpx 50rpx;
  background: linear-gradient(135deg, #FF5A7A, #FF7096); border-radius: 48rpx;
}

.auth-remind-btn text { font-size: 28rpx; color: #fff; font-weight: 500; }

// ===== 关于我 =====
.about-tags-grid {
  display: flex; flex-wrap: wrap; gap: 12rpx 12rpx; row-gap: 18rpx; margin-bottom: 22rpx;
  justify-content: flex-start;
}

.about-capsule {
  width: calc((100% - 24rpx) / 3);
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
  padding: 10rpx 8rpx;
  background: #FFF8FA; border-radius: 28rpx;
  font-size: 24rpx; color: #111; font-weight: 400;
}

.ai-profile-block, .ai-hope-block {
  background: #FAFAFA; border-radius: 16rpx; padding: 20rpx; margin-top: 6rpx;
}

.ai-label { display: flex; align-items: center; gap: 8rpx; margin-bottom: 10rpx; }

.ai-dot { font-size: 24rpx; }

.ai-label-text { font-size: 22rpx; color: $pink; font-weight: 500; }

.ai-text { font-size: 26rpx; color: #111; line-height: 1.6; font-weight: 300; }

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

.ai-entry-desc { font-size: 24rpx; color: $text-hint; margin-left: 70rpx; }

.ai-entry-arrow { font-size: 36rpx; color: $pink; }

// ===== Ta希望你 =====
.partner-tags-grid {
  display: flex; flex-wrap: wrap; gap: 18rpx 18rpx; row-gap: 24rpx; margin-bottom: 22rpx;
}

.partner-capsule {
  width: calc((100% - 36rpx) / 3);
  display: flex; align-items: center; justify-content: center;
  padding: 10rpx 8rpx;
  background: #F0F8FF; border-radius: 28rpx;
}

.pt-value { font-size: 24rpx; color: #111; font-weight: 400; margin-left: 6rpx; }

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
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
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
  font-size: 26rpx; color: #666; padding: 8rpx;
}

.report-divider { font-size: 24rpx; color: #999; }

// ===== 底部空白 =====
.bottom-spacer { height: 160rpx; }

// ===== 问答回答按钮 =====
.qa-answer-btn {
  display: flex; align-items: center; justify-content: center;
  margin-top: 16rpx; padding: 12rpx 0;
  text { font-size: 26rpx; color: #FF4D6A; }
}

// ===== 底部悬浮按钮（固定，无卡片背景） =====
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
  display: flex; justify-content: center; gap: 20rpx; padding: 16rpx 40rpx;
  /* 无背景、无阴影，纯悬浮 */
}

.bb-btn {
  height: 76rpx; display: inline-flex; align-items: center; justify-content: center;
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
  display: flex; justify-content: center; gap: 96rpx; padding: 20rpx 48rpx 48rpx;
}

.share-option {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  width: 140rpx;
  padding: 0; margin: 0; border: none; background: transparent;
  &::after { border: none; }
}

.share-option-icon {
  display: flex; align-items: center; justify-content: center;
  width: 56rpx; height: 56rpx; line-height: 56rpx;
  margin-bottom: 16rpx;
}
.share-option-label {
  font-size: 28rpx; color: #333; font-weight: 500; line-height: 1;
  text-align: center; width: 100%;
}

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

// ===== AI红娘说 弹窗 =====
.ma-loading { padding: 60rpx 0; display: flex; justify-content: center; }
.ma-loading-text { font-size: 26rpx; color: #999; }
.ma-list-item { display: block; font-size: 26rpx; color: #666; line-height: 1.7; margin-bottom: 8rpx; }
.ma-disclaimer { display: block; margin-top: 20rpx; font-size: 22rpx; color: #bbb; }

// ===== 人格类型标签 + 弹窗 =====
.personality-tag {
  display: inline-flex; align-items: center; margin-top: 12rpx;
  padding: 6rpx 18rpx; border-radius: 24rpx; background: #fff0f3;
  align-self: flex-start;
}
.pt-icon { font-size: 24rpx; margin-right: 6rpx; }
.pt-text { font-size: 24rpx; color: #ff6b9d; font-weight: 600; }

.pp-head { display: flex; flex-direction: column; align-items: center; margin-bottom: 20rpx; }
.pp-name { font-size: 36rpx; font-weight: bold; color: #333; }
.pp-nick { margin-top: 6rpx; font-size: 26rpx; color: #ff6b9d; }
.pp-radar-wrap { display: flex; justify-content: center; }
.pp-radar { width: 220px; height: 220px; }
.pp-tags { display: flex; flex-wrap: wrap; gap: 12rpx; justify-content: center; margin-top: 20rpx; }
.pp-tag { padding: 8rpx 20rpx; border-radius: 22rpx; background: #f7f7f9; color: #666; font-size: 24rpx; }
.pp-advice { margin-top: 28rpx; padding: 24rpx; border-radius: 16rpx; background: #fff8fa; }
.pp-advice-title { display: block; font-size: 26rpx; font-weight: 600; color: #ff6b9d; margin-bottom: 8rpx; }
.pp-advice-text { font-size: 26rpx; color: #666; line-height: 1.7; }

.viewer-guide-card { background: linear-gradient(135deg, #fff0f3, #ffe4ee); }

.fq-node { padding: 16rpx 20rpx; background: #FFF5F7; border-radius: 12rpx; margin-bottom: 12rpx; }

.fq-node-day { font-size: 24rpx; color: $pink; font-weight: bold; margin-bottom: 4rpx; display: block; }

.fq-node-title { font-size: 26rpx; color: #333; margin-bottom: 4rpx; display: block; }

.fq-node-desc { font-size: 24rpx; color: #999; }

.fq-disclaimer { font-size: 22rpx; color: #CCC; text-align: center; padding: 20rpx 0; }

// ===== 红娘评语（渐变粉色卡片，纯文字） =====
.mk-review-card {
  margin: 24rpx 30rpx; // 卡片与外部模块间距
  // 渐变粉色背景：从上到下柔和渐变（非纯色）
  background: linear-gradient(180deg, #FFF5F7 0%, #FFEBF0 100%);
  border-radius: 32rpx; // 加大圆角，强化卡片感
  padding: 40rpx 36rpx; // 充足内边距，增加呼吸感
  position: relative;
  overflow: hidden;
  // 柔和阴影，突出层级
  box-shadow: 0 4rpx 24rpx rgba(255, 77, 111, 0.08);
}
.mk-review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx; // 标题与正文间距
}
.mk-review-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #FF7A99; // 淡粉色标题（加深）
}
.mk-review-dash {
  font-size: 28rpx;
  color: #FFA6BC; // 同标题色
  opacity: 0.5; // 半透明装饰线
  letter-spacing: 2rpx;
}
.mk-review-body {
  position: relative;
}
.mk-review-text {
  font-size: 30rpx;
  color: #1A1A1A;
  line-height: 1.8; // 宽松行高，多行不拥挤
  white-space: pre-line; // 保留换行，每条信息独立成行
}
</style>

