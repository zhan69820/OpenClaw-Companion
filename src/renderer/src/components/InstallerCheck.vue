<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import StatusBadge from './common/StatusBadge.vue'
import { Download, CheckCircle2, AlertCircle, Terminal, ExternalLink, Loader2 } from 'lucide-vue-next'

const { t } = useI18n()

const emit = defineEmits<{
  installed: []
  skip: []
}>()

const checking = ref(true)
const isInstalled = ref(false)
const installing = ref(false)
const installResult = ref<{ success: boolean; message: string } | null>(null)
const platform = ref<'win32' | 'darwin' | 'linux' | 'unknown'>('unknown')

onMounted(async () => {
  detectPlatform()
  await checkInstallation()
})

function detectPlatform() {
  const p = navigator.platform.toLowerCase()
  if (p.includes('win')) platform.value = 'win32'
  else if (p.includes('mac')) platform.value = 'darwin'
  else if (p.includes('linux')) platform.value = 'linux'
}

async function checkInstallation() {
  checking.value = true
  try {
    // 尝试通过 IPC 检测 OpenClaw
    const result = await window.api.openclaw?.check?.() || { installed: false }
    isInstalled.value = result.installed
  } catch {
    // 如果 IPC 未实现，默认未安装
    isInstalled.value = false
  } finally {
    checking.value = false
  }
}

async function installOpenClaw() {
  installing.value = true
  installResult.value = null
  
  try {
    const result = await window.api.openclaw?.install?.() || { success: false, message: '安装功能暂未实现' }
    installResult.value = result
    if (result.success) {
      isInstalled.value = true
    }
  } catch (e: any) {
    installResult.value = { success: false, message: e?.message || '安装失败' }
  } finally {
    installing.value = false
  }
}

function getManualGuide() {
  switch (platform.value) {
    case 'win32': return t('installer.windowsGuide')
    case 'darwin': return t('installer.macGuide')
    case 'linux': return t('installer.linuxGuide')
    default: return t('installer.windowsGuide')
  }
}

function openNodejsDownload() {
  window.open('https://nodejs.org/', '_blank')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
    <div class="w-full max-w-xl rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">
      <!-- 头部 -->
      <div class="px-6 py-5 border-b border-border/30">
        <h2 class="text-xl font-bold text-foreground">{{ t('installer.title') }}</h2>
        <p class="text-sm text-muted-foreground mt-1">{{ t('installer.subtitle') }}</p>
      </div>

      <!-- 检测中 -->
      <div v-if="checking" class="px-6 py-12 text-center">
        <Loader2 class="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
        <p class="text-muted-foreground">{{ t('installer.detecting') }}</p>
      </div>

      <!-- 已安装 -->
      <div v-else-if="isInstalled" class="px-6 py-8 text-center">
        <CheckCircle2 class="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-foreground mb-2">{{ t('installer.found') }}</h3>
        <p class="text-sm text-muted-foreground mb-6">{{ t('installer.startConfig') }}</p>
        <button
          @click="emit('installed')"
          class="px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {{ t('common.save') }}
        </button>
      </div>

      <!-- 未安装 -->
      <div v-else class="px-6 py-6">
        <div class="flex items-start gap-4 mb-6">
          <div class="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
            <AlertCircle class="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h3 class="font-semibold text-foreground">{{ t('installer.notFound') }}</h3>
            <p class="text-sm text-muted-foreground mt-1">{{ t('installer.installPrompt') }}</p>
          </div>
        </div>

        <!-- 一键安装按钮 -->
        <button
          @click="installOpenClaw"
          :disabled="installing"
          class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all"
          :class="installing
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'"
        >
          <Loader2 v-if="installing" class="w-4 h-4 animate-spin" />
          <Download v-else class="w-4 h-4" />
          {{ installing ? t('installer.installing') : t('installer.oneClickInstall') }}
        </button>

        <!-- 安装结果 -->
        <div v-if="installResult" class="mt-4 p-3 rounded-lg" :class="installResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'">
          <div class="flex items-center gap-2">
            <component :is="installResult.success ? CheckCircle2 : AlertCircle" class="w-4 h-4" :class="installResult.success ? 'text-green-500' : 'text-destructive'" />
            <span class="text-sm" :class="installResult.success ? 'text-green-500' : 'text-destructive'">
              {{ installResult.success ? t('installer.installSuccess') : t('installer.installFailed') }}
            </span>
          </div>
          <p v-if="!installResult.success" class="text-xs text-muted-foreground mt-1">{{ installResult.message }}</p>
        </div>

        <!-- 手动安装指南 -->
        <div class="mt-6 pt-6 border-t border-border/30">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-foreground">{{ t('installer.manualGuide') }}</h4>
            <button
              @click="openNodejsDownload"
              class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
            >
              <ExternalLink class="w-3 h-3" />
              Node.js
            </button>
          </div>
          <div class="p-3 rounded-lg bg-muted/50">
            <pre class="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{{ getManualGuide() }}</pre>
          </div>
        </div>

        <!-- 跳过按钮 -->
        <div class="mt-6 flex justify-end">
          <button
            @click="emit('skip')"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {{ t('installer.skip') }} →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
