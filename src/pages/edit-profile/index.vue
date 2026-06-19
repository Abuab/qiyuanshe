<template>
  <view class="edit-profile-page">
    <!-- 自定义导航栏（含状态栏占位） -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <view class="nav-title">编辑资料</view>
        <view class="nav-right"></view>
      </view>
    </view>

    <scroll-view class="page-scroll" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx + 12) + 'px', height: 'calc(100vh - 120rpx)' }">
      <!-- 个人形象展示 -->
      <view class="section-card">
        <view class="photo-section-header">
          <view class="photo-title-bar"></view>
          <text class="photo-section-title">个人形象展示</text>
        </view>
        <view class="photo-grid-9">
          <!-- 第一张照片占4格 (2x2 左上角) -->
          <view v-if="photos.length > 0" class="photo-cell photo-cell-main" @tap="previewPhoto(0)">
            <image :src="getFullImageUrl(photos[0].photoUrl || photos[0].url)" mode="aspectFill" class="photo-cell-img" />
            <view class="photo-watermark">{{ appName }}</view>
            <view class="photo-main-label">头像/封面</view>
            <view v-if="Number(photos[0].auditStatus) === 0" class="photo-audit-overlay-large">待审核</view>
          </view>
          <!-- 占位 - 空的第一张 -->
          <view v-else class="photo-cell photo-cell-main photo-cell-add" @tap="uploadPhoto">
            <text class="photo-add-plus">+</text>
            <text class="photo-add-text">添加照片</text>
          </view>

          <!-- 第2-6张照片 -->
          <template v-for="(p, idx) in remainingPhotos" :key="p.id">
            <view class="photo-cell" @tap="previewPhoto(idx + 1)">
              <image :src="getFullImageUrl(p.photoUrl || p.url)" mode="aspectFill" class="photo-cell-img" />
              <view class="photo-watermark">{{ appName }}</view>
              <view v-if="Number(p.auditStatus) === 0" class="photo-audit-overlay">待审核</view>
              <image v-if="icons.page.deletePhotoIcon" class="photo-delete-icon" :src="icons.page.deletePhotoIcon" mode="aspectFit" @tap.stop="deletePhoto(p.id)" />
              <view v-else class="photo-delete-icon-text" @tap.stop="deletePhoto(p.id)">✕</view>
            </view>
          </template>

          <!-- 剩余空占位格 -->
          <view
            v-for="n in emptyCells"
            :key="'empty-' + n"
            class="photo-cell photo-cell-empty"
            @tap="photos.length < 6 ? uploadPhoto() : null"
          >
            <text v-if="photos.length < 6" class="photo-add-plus subtle">+</text>
          </view>
        </view>
        <view class="photo-section-footer">
          <text>添加个人照片，获得更多异性关注</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="section-card">
        <text class="section-title">基本信息</text>

        <view class="form-item">
          <text class="form-label">昵称</text>
          <input class="form-input disabled-input" :value="form.nickname" placeholder="昵称由系统自动生成" disabled />
        </view>

        <view class="form-item">
          <text class="form-label">性别</text>
          <view class="gender-group">
            <view class="gender-btn" :class="{ active: form.gender === 1 }" @tap="form.gender = 1">男</view>
            <view class="gender-btn" :class="{ active: form.gender === 2 }" @tap="form.gender = 2">女</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">出生年份</text>
          <picker mode="selector" :range="birthYearOptions" :value="birthYearIndex" @change="onBirthYearChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.birthYear }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.birthYear ? form.birthYear + '年' : '请选择出生年份' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">身高(cm)</text>
          <input class="form-input" v-model="form.height" placeholder="请输入身高" type="number" maxlength="3" />
        </view>

        <view class="form-item">
          <text class="form-label">体重(kg)</text>
          <input class="form-input" v-model="form.weight" placeholder="请输入体重" type="number" maxlength="3" />
        </view>

        <view class="form-item">
          <text class="form-label">学历</text>
          <picker mode="selector" :range="educationLabels" :value="educationIndex" @change="onEducationChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.education }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.education || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item" @tap="openOccupationPicker">
          <text class="form-label">职业</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.occupation }">{{ form.occupation || '请选择' }}</text>
            <text class="picker-arrow">></text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">月薪</text>
          <picker mode="selector" :range="incomeLabels" :value="incomeIndex" @change="onIncomeChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.incomeRange }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.incomeRange || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">婚姻状况</text>
          <picker mode="selector" :range="maritalOptions" :value="maritalIndex" @change="onMaritalChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.maritalStatus }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.maritalStatus || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item" @tap="openHousingStatusPicker">
          <text class="form-label">住房情况</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.housingStatus }">{{ form.housingStatus || '请选择' }}</text>
            <text class="picker-arrow">></text>
          </view>
        </view>

        <view class="form-item" @tap="openCarStatusPicker">
          <text class="form-label">车辆情况</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.carStatus }">{{ form.carStatus || '请选择' }}</text>
            <text class="picker-arrow">></text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">独生子女</text>
          <picker mode="selector" :range="onlyChildOptions" :value="onlyChildIndex" @change="onOnlyChildChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.onlyChild }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.onlyChild || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">何时结婚</text>
          <picker mode="selector" :range="whenMarryOptions" :value="whenMarryIndex" @change="onWhenMarryChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.whenMarry }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.whenMarry || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">属相</text>
          <picker mode="selector" :range="zodiacOptions" :value="zodiacIndex" @change="onZodiacChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.zodiac }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.zodiac || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">星座</text>
          <picker mode="selector" :range="constellationOptions" :value="constellationIndex" @change="onConstellationChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.constellation }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.constellation || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item" @tap="openCityPicker('hometown')">
          <text class="form-label">户籍地</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.hometown }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.hometown || '请选择户籍地' }}</text>
            <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
          </view>
        </view>

        <view class="form-item" @tap="openCityPicker('residence')">
          <text class="form-label">现居地</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.residence }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.residence || '请选择现居地' }}</text>
            <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
          </view>
        </view>
      </view>

      <!-- 我的特点 -->
      <view class="section-card">
        <view class="hope-ta-section">
          <view class="section-title-row">
            <text class="section-title-bar"></text>
            <text class="section-title">我的特点</text>
          </view>
          <view class="hope-ta-tags">
            <view v-for="(tag, idx) in form.personalityTags" :key="idx" class="hope-tag-item" @tap="removePersonalityEditTag(idx)">
              <text>{{ tag }}</text>
              <text class="hope-tag-close">×</text>
            </view>
            <view class="hope-tag-add" @tap="openPersonalityPicker">
              <text>+</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 择偶要求 -->
      <view class="section-card">
        <view class="section-title-row">
          <text class="section-title-bar"></text>
          <text class="section-title">择偶要求</text>
        </view>

        <view class="form-item">
          <text class="form-label">年龄范围</text>
          <picker mode="selector" :range="partnerAgeRangeOptions" :value="partnerAgeIndex" @change="onPartnerAgeChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerAgeRange }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerAgeRange || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">最低身高</text>
          <picker mode="selector" :range="partnerHeightOptions" :value="partnerHeightIndex" @change="onPartnerHeightChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerHeightMin }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerHeightMin || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">最低学历</text>
          <picker mode="selector" :range="partnerEducationOptions" :value="partnerEducationIndex" @change="onPartnerEducationChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerEducation }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerEducation || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">收入要求</text>
          <picker mode="selector" :range="partnerIncomeOptions" :value="partnerIncomeIndex" @change="onPartnerIncomeChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerIncome }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerIncome || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item" @tap="openHousingPicker">
          <text class="form-label">住房要求</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.housingRequirement }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.housingRequirement || '请选择' }}</text>
            <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">婚况要求</text>
          <picker mode="selector" :range="partnerMaritalOptions" :value="partnerMaritalIndex" @change="onPartnerMaritalChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerMaritalStatus }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerMaritalStatus || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">接受小孩</text>
          <picker mode="selector" :range="acceptChildrenOptions" :value="acceptChildrenIndex" @change="onAcceptChildrenChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.acceptChildren }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.acceptChildren || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <!-- 希望TA -->
        <view class="hope-ta-section">
          <view class="section-title-row">
            <text class="section-title-bar"></text>
            <text class="section-title">希望TA</text>
          </view>
          <view class="hope-ta-tags">
            <view v-for="(tag, idx) in form.hopeTaTags" :key="idx" class="hope-tag-item" @tap="removeHopeTaTag(idx)">
              <text>{{ tag }}</text>
              <text class="hope-tag-close">×</text>
            </view>
            <view class="hope-tag-add" @tap="openTagPicker">
              <text>+</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- 底部保存按钮 -->
    <view class="save-bar">
      <view class="save-btn" @tap="handleSave">
        <text>保存</text>
      </view>
    </view>

    <!-- 住房情况弹窗 -->
    <view class="popup-mask" v-if="showHousingStatusPopup" @tap="closeHousingStatusPicker"></view>
    <view class="popup-panel" :class="{ show: showHousingStatusPopup }">
      <view class="popup-header">
        <text class="popup-title">住房情况</text>
        <text class="popup-close" @tap="closeHousingStatusPicker">✕</text>
      </view>
      <view class="popup-body">
        <view class="popup-options">
          <view
            v-for="(opt, idx) in housingStatusOptions"
            :key="idx"
            class="popup-option"
            :class="{ active: form.housingStatus === opt }"
            @tap="selectHousingStatus(opt)"
          >
            <text>{{ opt }}</text>
          </view>
        </view>
      </view>
      <view class="popup-footer">
        <view class="popup-confirm" @tap="closeHousingStatusPicker">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 车辆情况弹窗 -->
    <view class="popup-mask" v-if="showCarStatusPopup" @tap="closeCarStatusPicker"></view>
    <view class="popup-panel" :class="{ show: showCarStatusPopup }">
      <view class="popup-header">
        <text class="popup-title">车辆情况</text>
        <text class="popup-close" @tap="closeCarStatusPicker">✕</text>
      </view>
      <view class="popup-body">
        <view class="popup-options">
          <view
            v-for="(opt, idx) in carStatusOptions"
            :key="idx"
            class="popup-option"
            :class="{ active: form.carStatus === opt }"
            @tap="selectCarStatus(opt)"
          >
            <text>{{ opt }}</text>
          </view>
        </view>
      </view>
      <view class="popup-footer">
        <view class="popup-confirm" @tap="closeCarStatusPicker">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 职业弹窗 -->
    <view class="popup-mask" v-if="showOccupationPopup" @tap="closeOccupationPicker"></view>
    <view class="popup-panel" :class="{ show: showOccupationPopup }">
      <view class="popup-header">
        <text class="popup-title">职业</text>
        <text class="popup-close" @tap="closeOccupationPicker">✕</text>
      </view>
      <view class="popup-body">
        <view class="popup-options">
          <view
            v-for="(opt, idx) in occupationOptions"
            :key="idx"
            class="popup-option"
            :class="{ active: form.occupation === opt }"
            @tap="selectOccupation(opt)"
          >
            <text>{{ opt }}</text>
          </view>
        </view>
      </view>
      <view class="popup-footer">
        <view class="popup-confirm" @tap="closeOccupationPicker">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 住房要求弹窗 -->
    <view class="popup-mask" v-if="showHousingPopup" @tap="closeHousingPicker"></view>
    <view class="popup-panel" :class="{ show: showHousingPopup }">
      <view class="popup-header">
        <text class="popup-title">住房要求</text>
        <text class="popup-close" @tap="closeHousingPicker">✕</text>
      </view>
      <view class="popup-body">
        <view class="popup-options">
          <view
            v-for="(opt, idx) in housingOptions"
            :key="idx"
            class="popup-option"
            :class="{ active: tempHousing.includes(opt) }"
            @tap="toggleHousing(opt)"
          >
            <text>{{ opt }}</text>
          </view>
        </view>
      </view>
      <view class="popup-footer">
        <view class="popup-confirm" @tap="confirmHousingPicker">
          <text>确定</text>
        </view>
      </view>
    </view>

    <!-- 希望TA标签弹窗 -->
    <view class="popup-mask" v-if="showTagPopup" @tap="closeTagPicker"></view>
    <view class="popup-panel" :class="{ show: showTagPopup }">
      <view class="popup-header">
        <text class="popup-title">希望TA</text>
        <text class="popup-close" @tap="closeTagPicker">✕</text>
      </view>
      <view class="popup-body">
        <view class="popup-options">
          <view
            v-for="(tag, idx) in hopeTaTagOptions"
            :key="idx"
            class="popup-option"
            :class="{ active: tempTags.includes(tag) }"
            @tap="toggleTag(tag)"
          >
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>
      <view class="popup-footer">
        <view class="popup-confirm" @tap="confirmTagPicker">
          <text>确定</text>
        </view>
      </view>
    </view>

    <!-- 城市选择器 -->
    <city-picker
      :visible="showCityPicker"
      @confirm="onCityConfirm"
      @close="showCityPicker = false"
    />

    <!-- 我的特点弹窗 -->
    <view class="popup-mask" v-if="showPersonalityPopup" @tap="closePersonalityPicker"></view>
    <view class="personality-popup-panel" :class="{ show: showPersonalityPopup }">
      <view class="personality-popup-header">
        <text class="personality-popup-title">我的特点</text>
        <text class="personality-popup-close" @tap="closePersonalityPicker">✕</text>
      </view>
      <view class="personality-popup-subtitle" v-if="tempPersonalityTags.length === 0">
        <text>系统将自动根据所选标签生成个人简介</text>
        <text>建议每个类型至少选择3项</text>
      </view>
      <!-- 已选标签 -->
      <view class="personality-selected-area" v-if="tempPersonalityTags.length > 0">
        <view v-for="(tag, idx) in tempPersonalityTags" :key="idx" class="personality-selected-tag">
          <text>{{ tag }}</text>
          <view class="personality-selected-remove" @tap.stop="removePersonalityTag(tag)">
            <text>✕</text>
          </view>
        </view>
      </view>
      <view class="personality-selected-empty" v-else>
        <text>请选择您的个性特点</text>
      </view>
      <!-- Tab 切换 -->
      <view class="personality-tabs">
        <view
          v-for="tab in personalityTabs"
          :key="tab.key"
          class="personality-tab"
          :class="{ active: activePersonalityTab === tab.key }"
          @tap="activePersonalityTab = tab.key"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
      <!-- 标签区 -->
      <scroll-view class="personality-options-scroll" scroll-y>
        <view class="personality-options">
          <view
            v-for="(tag, idx) in currentPersonalityOptions"
            :key="idx"
            class="personality-option-item"
            :class="{ active: tempPersonalityTags.includes(tag) }"
            @tap="togglePersonalityTag(tag)"
          >
            <text>{{ tag }}</text>
          </view>
        </view>
      </scroll-view>
      <!-- 底部确定按钮 -->
      <view class="personality-popup-footer">
        <view class="personality-confirm-btn" @tap="confirmPersonalityPicker">
          <text>确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import request, { put, get } from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { getFullImageUrl } from '@/utils/common'

const systemStore = useSystemStore()
import CityPicker from '@/components/city-picker/city-picker.vue'

const userStore = useUserStore()
const appName = computed(() => systemStore.appName || '栖缘社')
const icons = computed(() => systemStore.icons)
const saving = ref(false)
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

// ===== 选项数据 =====
const birthYearOptions = (() => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let y = currentYear - 18; y >= 1940; y--) years.push(String(y))
  return years
})()

const educationOptions = [
  { label: '高中', value: '高中' },
  { label: '大专', value: '大专' },
  { label: '本科', value: '本科' },
  { label: '硕士', value: '硕士' },
  { label: '博士', value: '博士' },
]
const educationLabels = educationOptions.map((e) => e.label)

const incomeOptions = [
  { label: '3千以下', value: '3千以下' },
  { label: '3-5千', value: '3-5千' },
  { label: '5-8千', value: '5-8千' },
  { label: '8千-1.2万', value: '8千-1.2万' },
  { label: '1.2-2万', value: '1.2-2万' },
  { label: '2-5万', value: '2-5万' },
  { label: '5万以上', value: '5万以上' },
]
const incomeLabels = incomeOptions.map((o) => o.label)
const maritalOptions = ['未婚', '离异', '丧偶']
const onlyChildOptions = ['是', '否']

const housingStatusOptions = ['已购房', '租房', '与父母同住', '其他']
const carStatusOptions = ['已购车', '未购车']

const whenMarryOptions = ['闪婚', '一年内', '两年内', '三年内', '时机成熟就结婚', '顺其自然']

const zodiacOptions = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

const constellationOptions = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
]

// 择偶要求选项
const partnerAgeRangeOptions = ['不限', '18-22岁', '20-25岁', '22-28岁', '25-30岁', '28-33岁', '30-35岁', '33-38岁', '35-40岁', '40岁以上']
const partnerHeightOptions = ['不限', '150cm以上', '155cm以上', '160cm以上', '165cm以上', '170cm以上', '175cm以上', '180cm以上', '185cm以上']
const partnerEducationOptions = ['不限', '高中', '大专', '本科', '硕士', '博士']
const partnerIncomeOptions = ['不限', '3千以上', '5千以上', '8千以上', '1万以上', '2万以上', '3万以上', '5万以上']
const partnerMaritalOptions = ['不限', '仅限未婚', '仅限离异']
const acceptChildrenOptions = ['不限', '不接受', '无所谓']

const housingOptions = [
  '不限', '和家人同住', '已购房', '租房', '婚后购房', '住在单位宿舍',
  '有婚房无贷款', '有婚房有贷款', '住亲朋家', '已购房无贷款',
  '已购房有贷款', '与父母同住', '需要时可购置', '房子买在老家', '自建房',
]

const DEFAULT_HOPE_TA_TAGS = [
  '品味出众', '喜欢厨艺', '不冷暴力', '重视家庭', '整洁干净', '阳光运动',
  '文艺范', '懂得尊重', '低调沉稳', '心地善良', '浪漫主义', '乐观积极',
  '成熟稳重', '爱情专一', '真诚靠谱', '风趣幽默', '温柔体贴', '有责任心',
  '有上进心', '孝敬父母', '能一起打拼', '独立不粘人',
]

const hopeTaTagOptions = computed(() => {
  return (systemStore.dicts.hopeTaTags as string[]) || DEFAULT_HOPE_TA_TAGS
})

// 我的特点标签选项
const personalityTabs = [
  { key: 'character' as const, label: '性格' },
  { key: 'hobby' as const, label: '爱好' },
  { key: 'loveRule' as const, label: '恋爱准则' },
]
const DEFAULT_PERSONALITY_TAGS: Record<string, string[]> = {
  character: [
    '话痨', '社牛', '慢热', '敏感', '闷骚', '佛系', '有强迫症', '热爱工作',
    '关注细节', '比较乖', '没心机', '笑点低', '真诚靠谱', '乐观自信', '调皮可爱',
    '温柔体贴', '贤惠顾家', '严谨细心', '智慧颜值并存', '爱玩爱闹', '勤奋好学',
    '风趣幽默', '有气质', '御姐范', '敢爱敢恨', '有选择恐惧症', '喜欢宅',
    '大方直率', '善解人意', '有完美主义', '知书达理', '有点社恐', '欢乐逗比',
    '外冷内热', '斯文内敛', '开朗积极', '淳朴憨厚',
  ],
  hobby: [
    '剧本杀', '玩游戏', '二次元', '看动漫', '看小说', '美食', '自驾游',
    '听音乐', '看电影', '爱追剧', 'K歌', '看书', '逛街', '宠物', '厨艺',
    '旅行', '运动', '户外爬山', '跑步', '精致生活',
  ],
  loveRule: [
    '接受姐弟恋', '绝不做舔狗', '接受异地恋', '信一见钟情', '拒绝异地恋',
    '宁缺也毋滥', '喜欢被照顾', '恋爱以结婚为目的', '拒大男子主义',
  ],
}

const personalityTagMap = computed<Record<string, string[]>>(() => {
  return (systemStore.dicts.personalityTags as Record<string, string[]>) || DEFAULT_PERSONALITY_TAGS
})

const activePersonalityTab = ref<'character' | 'hobby' | 'loveRule'>('character')
const currentPersonalityOptions = computed(() => personalityTagMap.value[activePersonalityTab.value] || [])

// ===== 表单数据 =====
const form = ref({
  avatar: '',
  avatarReviewStatus: 1,
  reviewStatus: 1,
  nickname: '',
  gender: 0,
  birthYear: undefined as number | undefined,
  height: undefined as number | undefined,
  weight: undefined as number | undefined,
  education: '',
  occupation: '',
  incomeRange: '',
  maritalStatus: '',
  housingStatus: '',
  carStatus: '',
  onlyChild: '',
  whenMarry: '',
  zodiac: '',
  constellation: '',
  residence: '',
  hometown: '',
  // 择偶要求
  partnerAgeRange: '',
  partnerHeightMin: '',
  partnerEducation: '',
  partnerIncome: '',
  housingRequirement: '',
  partnerMaritalStatus: '',
  acceptChildren: '',
  hopeTaTags: [] as string[],
  personalityTags: [] as string[],
})

// 照片管理
const photos = ref<any[]>([])

// 除第一张外的其他照片
const remainingPhotos = computed(() => photos.value.slice(1, 6))

// 9宫格中剩余的空格子数（总数9 - 1个大格=5个小格可放，大格算4格，每个小格算1格）
// 实际布局: position1占4格(cell 0-3)，后续5个位置是小格
const emptyCells = computed(() => {
  const smallRemaining = Math.max(0, 5 - remainingPhotos.value.length)
  if (photos.value.length === 0) return 5  // 一张都没有，5个空小格
  return smallRemaining
})

// ===== 弹窗状态 =====
const showHousingPopup = ref(false)
const tempHousing = ref<string[]>([])
const showHousingStatusPopup = ref(false)
const showCarStatusPopup = ref(false)
const showTagPopup = ref(false)
const tempTags = ref<string[]>([])

// 城市选择器
const showCityPicker = ref(false)
const cityTarget = ref<'residence' | 'hometown'>('residence')

// 我的特点弹窗
const showPersonalityPopup = ref(false)
const tempPersonalityTags = ref<string[]>([])

const openPersonalityPicker = () => {
  tempPersonalityTags.value = [...form.value.personalityTags]
  showPersonalityPopup.value = true
}
const closePersonalityPicker = () => { showPersonalityPopup.value = false }
const togglePersonalityTag = (tag: string) => {
  const idx = tempPersonalityTags.value.indexOf(tag)
  if (idx > -1) {
    tempPersonalityTags.value.splice(idx, 1)
  } else {
    tempPersonalityTags.value.push(tag)
  }
}
const removePersonalityTag = (tag: string) => {
  const idx = tempPersonalityTags.value.indexOf(tag)
  if (idx > -1) tempPersonalityTags.value.splice(idx, 1)
}
const confirmPersonalityPicker = () => {
  form.value.personalityTags = [...tempPersonalityTags.value]
  showPersonalityPopup.value = false
}

// ===== 初始化 =====
onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)

  systemStore.loadDicts()

  fetchPhotos()

  let info: any = userStore.userInfo

  // 本地无缓存时从服务器获取最新资料（如重新编译后 storage 被清空）
  if (!info) {
    try {
      const profile = await get<any>('/auth/profile')
      if (profile) {
        info = profile
        userStore.updateProfile(profile)
      }
    } catch (_) { /* 网络失败或无登录态时静默跳过 */ }
  }

  if (info) {
    form.value = {
      avatar: info.avatar || '',
      avatarReviewStatus: info.avatarReviewStatus ?? 1,
      reviewStatus: info.reviewStatus ?? 1,
      nickname: info.nickname || '',
      gender: info.gender ?? 0,
      birthYear: info.birthYear,
      height: info.height,
      weight: info.weight,
      education: info.education || '',
      occupation: info.occupation || '',
      incomeRange: info.incomeRange || '',
      maritalStatus: info.maritalStatus || '',
      housingStatus: info.housingStatus || '',
      carStatus: info.carStatus || '',
      onlyChild: info.onlyChild || '',
      whenMarry: info.whenMarry || '',
      zodiac: info.zodiac || '',
      constellation: info.constellation || '',
      residence: info.residence || info.city || '',
      hometown: info.hometown || '',
      partnerAgeRange: info.partnerAgeRange || '',
      partnerHeightMin: info.partnerHeightMin || '',
      partnerEducation: info.partnerEducation || '',
      partnerIncome: info.partnerIncome || '',
      housingRequirement: info.housingRequirement || '',
      partnerMaritalStatus: info.partnerMaritalStatus || '',
      acceptChildren: info.acceptChildren || '',
      hopeTaTags: parseTags(info.hopeTaTags),
      personalityTags: parseTags(info.personalityTags),
    }
  }
})

const parseTags = (val: any): string[] => {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

// ===== Computed =====
const birthYearIndex = computed(() => {
  if (!form.value.birthYear) return -1
  return birthYearOptions.findIndex((o) => o.startsWith(String(form.value.birthYear)))
})
const educationIndex = computed(() => educationOptions.findIndex((o) => o.value === form.value.education))
const incomeIndex = computed(() => incomeOptions.findIndex((o) => o.value === form.value.incomeRange))
const maritalIndex = computed(() => maritalOptions.indexOf(form.value.maritalStatus))
const onlyChildIndex = computed(() => onlyChildOptions.indexOf(form.value.onlyChild))
const whenMarryIndex = computed(() => whenMarryOptions.indexOf(form.value.whenMarry))
const zodiacIndex = computed(() => zodiacOptions.indexOf(form.value.zodiac))
const constellationIndex = computed(() => constellationOptions.indexOf(form.value.constellation))

const partnerAgeIndex = computed(() => partnerAgeRangeOptions.indexOf(form.value.partnerAgeRange))
const partnerHeightIndex = computed(() => partnerHeightOptions.indexOf(form.value.partnerHeightMin))
const partnerEducationIndex = computed(() => partnerEducationOptions.indexOf(form.value.partnerEducation))
const partnerIncomeIndex = computed(() => partnerIncomeOptions.indexOf(form.value.partnerIncome))
const partnerMaritalIndex = computed(() => partnerMaritalOptions.indexOf(form.value.partnerMaritalStatus))
const acceptChildrenIndex = computed(() => acceptChildrenOptions.indexOf(form.value.acceptChildren))

// ===== 头像 =====
const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const uploadRes = await uploadImage(filePath)
        form.value.avatar = uploadRes.url
        await request({ url: '/users/avatar-review', method: 'POST', data: { avatarUrl: uploadRes.url } } as any)
        form.value.avatarReviewStatus = 0
        uni.showToast({ title: '已提交审核', icon: 'success' })
      } catch (err: unknown) {
        const error = err as Error
        console.error('头像上传失败:', error)
        const msg = error.message === 'Unauthorized' ? '请先登录' : '上传失败，请重试'
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

// ===== Picker 事件 =====
const onBirthYearChange = (e: { detail: { value: number } }) => {
  form.value.birthYear = parseInt(birthYearOptions[e.detail.value])
}
const onEducationChange = (e: { detail: { value: number } }) => {
  form.value.education = educationOptions[e.detail.value].value
}
const onIncomeChange = (e: { detail: { value: number } }) => {
  form.value.incomeRange = incomeOptions[e.detail.value].value
}
const onMaritalChange = (e: { detail: { value: number } }) => {
  form.value.maritalStatus = maritalOptions[e.detail.value]
}
const onOnlyChildChange = (e: { detail: { value: number } }) => {
  form.value.onlyChild = onlyChildOptions[e.detail.value]
}
const onWhenMarryChange = (e: { detail: { value: number } }) => {
  form.value.whenMarry = whenMarryOptions[e.detail.value]
}
const onZodiacChange = (e: { detail: { value: number } }) => {
  form.value.zodiac = zodiacOptions[e.detail.value]
}
const onConstellationChange = (e: { detail: { value: number } }) => {
  form.value.constellation = constellationOptions[e.detail.value]
}
const onPartnerAgeChange = (e: { detail: { value: number } }) => {
  form.value.partnerAgeRange = partnerAgeRangeOptions[e.detail.value]
}
const onPartnerHeightChange = (e: { detail: { value: number } }) => {
  form.value.partnerHeightMin = partnerHeightOptions[e.detail.value]
}
const onPartnerEducationChange = (e: { detail: { value: number } }) => {
  form.value.partnerEducation = partnerEducationOptions[e.detail.value]
}
const onPartnerIncomeChange = (e: { detail: { value: number } }) => {
  form.value.partnerIncome = partnerIncomeOptions[e.detail.value]
}
const onPartnerMaritalChange = (e: { detail: { value: number } }) => {
  form.value.partnerMaritalStatus = partnerMaritalOptions[e.detail.value]
}
const onAcceptChildrenChange = (e: { detail: { value: number } }) => {
  form.value.acceptChildren = acceptChildrenOptions[e.detail.value]
}

// ===== 住房要求弹窗 =====
const openHousingPicker = () => {
  tempHousing.value = form.value.housingRequirement
    ? form.value.housingRequirement.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  showHousingPopup.value = true
}
const closeHousingPicker = () => { showHousingPopup.value = false }
const toggleHousing = (opt: string) => {
  const idx = tempHousing.value.indexOf(opt)
  if (idx > -1) {
    tempHousing.value.splice(idx, 1)
  } else {
    tempHousing.value.push(opt)
  }
}
const confirmHousingPicker = () => {
  form.value.housingRequirement = tempHousing.value.join(',')
  showHousingPopup.value = false
}

// ===== 住房情况弹窗 =====
const openHousingStatusPicker = () => { showHousingStatusPopup.value = true }
const closeHousingStatusPicker = () => { showHousingStatusPopup.value = false }
const selectHousingStatus = (opt: string) => {
  form.value.housingStatus = opt
  showHousingStatusPopup.value = false
}

// ===== 车辆情况弹窗 =====
const openCarStatusPicker = () => { showCarStatusPopup.value = true }
const closeCarStatusPicker = () => { showCarStatusPopup.value = false }
const selectCarStatus = (opt: string) => {
  form.value.carStatus = opt
  showCarStatusPopup.value = false
}

// ===== 职业弹窗 =====
const DEFAULT_OCCUPATION = [
  '事业编','中学老师','小学老师','幼师','辅导站老师','服务行业','保险','老师','药剂师',
  '设计','培训','发型师','运营','个体工商户','普通职员','银行','工程','财务','技术',
  '技术工','餐饮','体制内','事业单位','销售','公务员','国企职员','工程师','银行职员',
  '个体户','老板创业者','公司职员','公司高管','律师','设计师','IT从业者','客服','人事',
  '财务会计','军人','服务业','教师','医生','护士','警察','其他',
]
const occupationOptions = computed(() => {
  return (systemStore.dicts.occupation as string[]) || DEFAULT_OCCUPATION
})
const showOccupationPopup = ref(false)
const openOccupationPicker = () => { showOccupationPopup.value = true }
const closeOccupationPicker = () => { showOccupationPopup.value = false }
const selectOccupation = (opt: string) => {
  form.value.occupation = opt
  showOccupationPopup.value = false
}

// ===== 希望TA标签弹窗 =====
const openTagPicker = () => {
  tempTags.value = [...form.value.hopeTaTags]
  showTagPopup.value = true
}
const closeTagPicker = () => { showTagPopup.value = false }
const toggleTag = (tag: string) => {
  const idx = tempTags.value.indexOf(tag)
  if (idx > -1) {
    tempTags.value.splice(idx, 1)
  } else {
    tempTags.value.push(tag)
  }
}
const confirmTagPicker = () => {
  form.value.hopeTaTags = [...tempTags.value]
  showTagPopup.value = false
}
const removeHopeTaTag = (idx: number) => {
  form.value.hopeTaTags.splice(idx, 1)
}
const removePersonalityEditTag = (idx: number) => {
  form.value.personalityTags.splice(idx, 1)
}

// ===== 城市选择器 =====
const openCityPicker = (target: 'residence' | 'hometown' = 'residence') => {
  cityTarget.value = target
  showCityPicker.value = true
}
const onCityConfirm = (value: string, _ids: number[]) => {
  if (cityTarget.value === 'hometown') {
    form.value.hometown = value
  } else {
    form.value.residence = value
  }
  showCityPicker.value = false
}

// ===== 照片管理 =====
const fetchPhotos = async () => {
  try {
    const res: any = await request({ url: '/users/photos', method: 'GET' } as any)
    photos.value = res?.list || []
  } catch (e) { console.error(e) }
}

const uploadPhoto = () => {
  uni.chooseImage({
    count: 6 - photos.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: any) => {
      const files = res.tempFiles || res.tempFilePaths || []
      uni.showLoading({ title: '上传中...' })
      for (const f of files) {
        try {
          const uploadRes = await uploadImage(typeof f === 'string' ? f : f.path || f.tempFilePath)
          if (uploadRes?.url) {
            await request({ url: '/users/photos', method: 'POST', data: { url: uploadRes.url } } as any)
          }
        } catch (e: any) {
          console.error(e)
          if (e.message !== 'Unauthorized') {
            uni.showToast({ title: '上传失败', icon: 'none' })
          }
        }
      }
      uni.hideLoading()
      await fetchPhotos()
    },
  })
}

const deletePhoto = (id: number) => {
  uni.showModal({
    title: '提示',
    content: '确定删除这张照片吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({ url: `/users/photos/${id}`, method: 'DELETE' } as any)
          await fetchPhotos()
        } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
      }
    },
  })
}

const previewPhoto = (idx: number) => {
  uni.previewImage({
    current: idx,
    urls: photos.value.map((p: any) => getFullImageUrl(p.photoUrl || p.url)),
  })
}

// ===== 保存 =====
const handleSave = async () => {
  if (saving.value) return

  saving.value = true
  uni.showLoading({ title: '保存中...' })

  try {
    // 头像自动同步：使用主图（第一张照片），确保上传照片后头像即时生效
    const mainPhoto = photos.value.find((p: any) => Number(p.isMain) === 1) || photos.value[0]
    const avatarToSave = mainPhoto ? (mainPhoto.photoUrl || mainPhoto.url) : form.value.avatar

    const data: Record<string, unknown> = {
      avatar: avatarToSave,
      gender: form.value.gender,
      birthYear: form.value.birthYear,
      height: form.value.height ? Number(form.value.height) : undefined,
      weight: form.value.weight ? Number(form.value.weight) : undefined,
      education: form.value.education,
      occupation: form.value.occupation.trim(),
      incomeRange: form.value.incomeRange,
      maritalStatus: form.value.maritalStatus,
      housingStatus: form.value.housingStatus,
      carStatus: form.value.carStatus,
      onlyChild: form.value.onlyChild,
      whenMarry: form.value.whenMarry,
      zodiac: form.value.zodiac,
      constellation: form.value.constellation,
      residence: form.value.residence.trim(),
      hometown: form.value.hometown.trim(),
      partnerAgeRange: form.value.partnerAgeRange,
      partnerHeightMin: form.value.partnerHeightMin,
      partnerEducation: form.value.partnerEducation,
      partnerIncome: form.value.partnerIncome,
      housingRequirement: form.value.housingRequirement,
      partnerMaritalStatus: form.value.partnerMaritalStatus,
      acceptChildren: form.value.acceptChildren,
      hopeTaTags: form.value.hopeTaTags.join(','),
      personalityTags: form.value.personalityTags.join(','),
    }

    const result = await put<Record<string, unknown>>('/users/profile', data)

    userStore.updateProfile({
      ...(result || {}),
      // 确保标签数组始终以数组形式存入 store，无论后端返回什么
      personalityTags: form.value.personalityTags,
      hopeTaTags: form.value.hopeTaTags,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
    }, 1200)
  } catch (err: unknown) {
    const error = err as Error
    console.error('保存失败:', error.message)
    if (error.message !== 'Unauthorized') {
      uni.showToast({ title: error.message || '保存失败，请重试', icon: 'none' })
    }
  } finally {
    saving.value = false
    uni.hideLoading()
  }
}

const handleBack = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
.edit-profile-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}

.nav-left,
.nav-right {
  width: 120rpx;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.page-scroll {
  box-sizing: border-box;
}

.section-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 28rpx 28rpx 8rpx;
  margin: 0 24rpx 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;

  .section-title-bar {
    width: 6rpx;
    height: 32rpx;
    background-color: #FF6B9D;
    border-radius: 3rpx;
    margin-right: 12rpx;
  }

  .section-title {
    margin-bottom: 0;
  }
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding-bottom: 20rpx;
}

.avatar-img {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
}

.avatar-tip {
  font-size: 24rpx;
  color: #999;
}

.avatar-badges {
  display: flex;
  justify-content: center;
  margin-top: 8rpx;
}

.badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  &.pending {
    background-color: #FFF7E6;
    color: #FA8C16;
  }

  &.rejected {
    background-color: #FFF1F0;
    color: #FF4D4F;
  }
}

.form-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.form-label {
  width: 140rpx;
  font-size: 28rpx;
  color: #666;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
  height: 60rpx;

  &.disabled-input {
    color: #999;
  }
}

.form-picker {
  flex: 1;
  display: flex;
  align-items: center;
  height: 60rpx;

  .picker-value {
    flex: 1;
    text-align: right;
    font-size: 28rpx;
    color: #333;
  }

  .picker-arrow {
    font-size: 24rpx;
    color: #ccc;
    margin-left: 8rpx;
    flex-shrink: 0;
  }
}

.placeholder {
  color: #ccc;
}

.picker-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.gender-group {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}

.gender-btn {
  padding: 10rpx 40rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #999;
  background-color: #f5f5f5;

  &.active {
    background-color: #FF6B9D;
    color: #fff;
  }
}

/* 胶囊选择 */
.form-item-capsule {
  padding: 20rpx 0;
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f5f5f5;

  .form-label {
    width: 140rpx;
    flex-shrink: 0;
  }
}

.capsule-group {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  flex-wrap: wrap;
}

.capsule-btn {
  padding: 10rpx 28rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #999;
  background-color: #f5f5f5;

  &.active {
    background-color: #FF6B9D;
    color: #fff;
  }
}

.intro-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: #333;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
  box-sizing: border-box;
}

.intro-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999;
  padding: 8rpx 0 12rpx;

  &.over {
    color: #FF6B9D;
  }
}

/* 希望TA 标签 */
.hope-ta-section {
  padding: 16rpx 0 20rpx;
}

.hope-ta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-top: 8rpx;
}

.hope-tag-item {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background-color: #FFF5F7;
  border-radius: 30rpx;
  height: 56rpx;
  box-sizing: border-box;

  text {
    font-size: 26rpx;
    color: #FF6B9D;
  }
}

.hope-tag-close {
  margin-left: 8rpx;
  font-size: 24rpx !important;
  color: #FF6B9D !important;
}

.hope-tag-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 2rpx solid #FFD0E0;

  text {
    font-size: 32rpx;
    color: #FF6B9D;
    line-height: 1;
  }
}

/* 弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 200;
}

.popup-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 201;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  max-height: 70vh;
  display: flex;
  flex-direction: column;

  &.show {
    transform: translateY(0);
  }
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 32rpx 20rpx;
  position: relative;
}

.popup-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.popup-close {
  position: absolute;
  right: 32rpx;
  font-size: 36rpx;
  color: #999;
  padding: 8rpx;
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 30rpx;
}

.popup-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 20rpx;
}

.popup-option {
  padding: 16rpx 30rpx;
  border-radius: 40rpx;
  background-color: #f5f5f5;
  height: 66rpx;
  display: flex;
  align-items: center;
  box-sizing: border-box;

  text {
    font-size: 28rpx;
    color: #333;
  }

  &.active {
    background-color: #FF6B9D;

    text {
      color: #fff;
    }
  }
}

.popup-footer {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.popup-confirm {
  width: 100%;
  height: 88rpx;
  background-color: #FF6B9D;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    color: #fff;
    font-weight: bold;
  }
}

/* 个人形象展示 */
.photo-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.photo-title-bar {
  width: 6rpx;
  height: 32rpx;
  background: #FF6B9D;
  border-radius: 3rpx;
  margin-right: 12rpx;
  font-weight: bold;
}

.photo-section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.photo-grid-9 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 200rpx);
  gap: 6rpx;
}

.photo-cell {
  position: relative;
  border-radius: 8rpx;
  overflow: hidden;
  background: #f5f5f5;
}

.photo-cell-main {
  grid-row: 1 / 3;
  grid-column: 1 / 3;
}

.photo-cell-img {
  width: 100%;
  height: 100%;
}

.photo-watermark {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  color: rgba(255, 255, 255, 0.45);
  font-size: 20rpx;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.photo-main-label {
  position: absolute;
  bottom: 6rpx;
  left: 6rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.photo-audit-overlay-large {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.4);
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
}

.photo-audit-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 22rpx;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.45);
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.photo-delete-icon {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  z-index: 2;

  .delete-icon-img {
    width: 100%;
    height: 100%;
  }
}

.photo-delete-icon-text {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  z-index: 2;
}

.photo-cell-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #ddd;
  background: #fafafa;
}

.photo-add-plus {
  font-size: 48rpx;
  color: #ccc;
  line-height: 1;

  &.subtle {
    font-size: 36rpx;
    color: #e0e0e0;
  }
}

.photo-add-text {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.photo-cell-empty {
  border: 2rpx dashed #eee;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-section-footer {
  align-self: flex-start;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #333;
}

.bottom-safe {
  height: 40rpx;
}

.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
  z-index: 99;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  background-color: #FF6B9D;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }
}

/* 我的特点标签 */
.personality-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-top: 8rpx;
}

.personality-tag-item {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  border: 1rpx solid #FF6B9D;
  border-radius: 30rpx;
  background-color: #FFF0F3;

  text {
    font-size: 24rpx;
    color: #FF6B9D;
  }
}

.personality-tag-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 30rpx;
  border: 1rpx solid #FF6B9D;

  text {
    font-size: 28rpx;
    color: #FF6B9D;
    line-height: 1;
  }
}

/* 我的特点弹窗 */
.personality-popup-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 201;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  max-height: 85vh;
  display: flex;
  flex-direction: column;

  &.show {
    transform: translateY(0);
  }
}

.personality-popup-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 32rpx 8rpx;
  position: relative;
}

.personality-popup-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.personality-popup-close {
  position: absolute;
  right: 32rpx;
  font-size: 36rpx;
  color: #999;
  padding: 8rpx;
}

.personality-popup-subtitle {
  padding: 0 32rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;

  text {
    font-size: 24rpx;
    color: #FF6B9D;
  }
}

.personality-selected-area {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 8rpx 30rpx 16rpx;
  min-height: 0;
}

.personality-selected-tag {
  display: flex;
  align-items: center;
  padding: 6rpx 12rpx 6rpx 20rpx;
  border-radius: 30rpx;
  background-color: #FF6B9D;

  text {
    font-size: 24rpx;
    color: #fff;
  }
}

.personality-selected-remove {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background-color: #FF6B9D;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
  flex-shrink: 0;

  text {
    font-size: 22rpx;
    color: #fff;
    line-height: 1;
    text-align: center;
  }
}

.personality-selected-empty {
  padding: 16rpx 30rpx;

  text {
    font-size: 24rpx;
    color: #ccc;
  }
}

.personality-tabs {
  display: flex;
  border-bottom: 1rpx solid #eee;
  padding: 0 30rpx;
}

.personality-tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  position: relative;

  text {
    font-size: 28rpx;
    color: #999;
  }

  &.active {
    text {
      color: #FF6B9D;
      font-weight: bold;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background-color: #FF6B9D;
      border-radius: 2rpx;
    }
  }
}

.personality-options-scroll {
  flex: 1;
  padding: 16rpx 30rpx;
  max-height: 50vh;
}

.personality-options {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.personality-option-item {
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  background-color: #F5F5F5;

  text {
    font-size: 26rpx;
    color: #666;
  }

  &.active {
    background-color: #FF6B9D;

    text {
      color: #fff;
    }
  }
}

.personality-popup-footer {
  padding: 16rpx 30rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}

.personality-confirm-btn {
  width: 100%;
  height: 88rpx;
  background-color: #FF6B9D;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }
}
</style>
