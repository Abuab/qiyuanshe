<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from './store/admin'

const adminStore = useAdminStore()

onMounted(() => {
  adminStore.initApp()
})
</script>

<style lang="scss">
#app {
  height: 100vh;
  overflow: hidden;
}
</style>
