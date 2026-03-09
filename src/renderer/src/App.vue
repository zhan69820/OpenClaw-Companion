<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import AppLayout from '@/components/layout/AppLayout.vue'
import InstallerCheck from '@/components/InstallerCheck.vue'

const config = useConfigStore()
const showInstaller = ref(false)
const skipInstaller = ref(false)

onMounted(async () => {
  // 检测 OpenClaw 安装
  try {
    const result = await window.api.openclaw?.check?.()
    if (!result?.installed && !skipInstaller.value) {
      showInstaller.value = true
    }
  } catch {
    // 如果检测失败，显示安装器
    showInstaller.value = true
  }
  
  await config.detectAndLoad()
})

function onInstalled() {
  showInstaller.value = false
}

function onSkip() {
  skipInstaller.value = true
  showInstaller.value = false
}
</script>

<template>
  <InstallerCheck 
    v-if="showInstaller" 
    @installed="onInstalled"
    @skip="onSkip"
  />
  <AppLayout />
</template>
