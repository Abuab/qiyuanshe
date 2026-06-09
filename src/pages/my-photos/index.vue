<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">我的照片</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view class="photo-grid">
        <view v-for="(photo, idx) in photos" :key="idx" class="photo-item">
          <image :src="photo.url" mode="aspectFill" class="photo-img" />
          <view v-if="photo.isMain" class="main-badge">主图</view>
          <view class="photo-actions">
            <text v-if="!photo.isMain" @tap="setMain(photo.id)">设为主图</text>
            <text class="del" @tap="removePhoto(photo.id)">删除</text>
          </view>
        </view>
        <view v-if="photos.length < 9" class="add-btn" @tap="chooseImage">
          <text class="add-icon">+</text>
          <text class="add-text">上传照片</text>
        </view>
      </view>
      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get, post, del } from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { safeNavigateBack } from '@/utils/navigate'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const photos = ref<any[]>([])

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await fetchPhotos()
})

async function fetchPhotos() {
  try { const res = await get<any>('/users/photos'); photos.value = res?.list || res || [] }
  catch (e) { console.error(e) }
}

async function chooseImage() {
  uni.chooseImage({
    count: 9 - photos.value.length,
    success: async (res: any) => {
      const files = res.tempFiles || res.tempFilePaths || []
      for (const f of files) {
        try {
          const result = await uploadImage(typeof f === 'string' ? f : f.path || f.tempFilePath)
          if (result?.url) {
            await post('/users/photos', { url: result.url })
            await fetchPhotos()
          }
        } catch (e) { console.error(e) }
      }
    },
  })
}

async function setMain(id: number) {
  try { await post(`/users/photos/${id}/main`); await fetchPhotos(); uni.showToast({ title: '已设置', icon: 'success' }) }
  catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
}

async function removePhoto(id: number) {
  try { await del(`/users/photos/${id}`); photos.value = photos.value.filter(p => p.id !== id); uni.showToast({ title: '已删除', icon: 'none' }) }
  catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
}

function handleBack() { safeNavigateBack() }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.photo-grid { display: flex; flex-wrap: wrap; }
.photo-item { width: calc(33.33% - 16rpx); margin: 8rpx; position: relative; background: #fff; border-radius: 8rpx; overflow: hidden; }
.photo-img { width: 100%; height: 220rpx; }
.main-badge { position: absolute; top: 8rpx; left: 8rpx; background: #e7412b; color: #fff; font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.photo-actions { display: flex; justify-content: space-around; padding: 12rpx 0; }
.photo-actions text { font-size: 22rpx; color: #666; }
.photo-actions .del { color: #e7412b; }
.add-btn { width: calc(33.33% - 16rpx); margin: 8rpx; height: 220rpx; background: #fff; border-radius: 8rpx; border: 2rpx dashed #ddd; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.add-icon { font-size: 60rpx; color: #ddd; }
.add-text { font-size: 22rpx; color: #999; margin-top: 8rpx; }
.bottom-safe { height: 60rpx; }
</style>
