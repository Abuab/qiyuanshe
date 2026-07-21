<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">发帖到 {{ circleName }}</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view class="form">
        <textarea v-model="content" placeholder="说点什么..." :maxlength="500" class="textarea" />
        <view class="image-upload">
          <view v-for="(img, idx) in images" :key="idx" class="img-item">
            <image :src="img" mode="aspectFill" class="img" />
            <text class="del" @tap="removeImage(idx)">×</text>
          </view>
          <view v-if="images.length < 9" class="add-btn" @tap="chooseImage">
            <text class="add-icon">+</text>
          </view>
        </view>
        <button class="submit-btn" :disabled="!content.trim()" @tap="handleSubmit">发布</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { post } from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { safeNavigateBack } from '@/utils/navigate'
import { requireLogin } from '@/utils/auth'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const circleId = ref(0)
const circleName = ref('')
const content = ref('')
const images = ref<string[]>([])

onMounted(() => {
  if (!requireLogin()) return

  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any).options || {}
  circleId.value = +opts.id
  circleName.value = decodeURIComponent(opts.name || '')
})

function handleBack() { safeNavigateBack() }

function chooseImage() {
  uni.chooseImage({
    count: 9 - images.value.length,
    success: async (res: any) => {
      const files = res.tempFiles || []
      for (const f of files) {
        try {
          const result = await uploadImage(f.path || f.tempFilePath || f)
          if (result?.url) images.value.push(result.url)
        } catch (e) { console.error(e) }
      }
    },
  })
}

function removeImage(idx: number) { images.value.splice(idx, 1) }

async function handleSubmit() {
  if (!content.value.trim()) return
  try {
    await post('/circles/posts', { circleId: circleId.value, content: content.value, images: images.value })
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => safeNavigateBack(), 1500)
  } catch (e) { uni.showToast({ title: '发布失败', icon: 'none' }) }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 30rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.form { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.textarea { width: 100%; min-height: 200rpx; font-size: 28rpx; }
.image-upload { display: flex; flex-wrap: wrap; margin-top: 24rpx; }
.img-item { position: relative; width: 160rpx; height: 160rpx; margin: 0 16rpx 16rpx 0; }
.img { width: 100%; height: 100%; border-radius: 8rpx; }
.del { position: absolute; top: -12rpx; right: -12rpx; width: 40rpx; height: 40rpx; background: #e7412b; color: #fff; border-radius: 50%; text-align: center; line-height: 40rpx; font-size: 24rpx; }
.add-btn { width: 160rpx; height: 160rpx; border: 2rpx dashed #ddd; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; }
.add-icon { font-size: 60rpx; color: #ddd; }
.submit-btn { margin-top: 32rpx; background: #e7412b; color: #fff; border-radius: 40rpx; height: 80rpx; line-height: 80rpx; font-size: 30rpx; }
</style>
