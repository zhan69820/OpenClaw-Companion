<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Download, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink, Zap } from 'lucide-vue-next'

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date'

const show = ref(false)
const state = ref<UpdateState>('idle')
const version = ref('')
const errorMsg = ref('')
const progress = ref(0)
const speed = ref(0)
const transferred = ref(0)
const total = ref(0)

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatSpeed(bps: number): string {
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
}

const unsubscribers: Array<() => void> = []

onMounted(() => {
  const off = [
    window.api.updater.on('update:checking', () => {
      state.value = 'checking'
      show.value = true
    }),
    window.api.updater.on('update:available', (payload: any) => {
      state.value = 'available'
      version.value = payload?.version || ''
      show.value = true
    }),
    window.api.updater.on('update:not-available', () => {
      state.value = 'up-to-date'
      show.value = true
      // 2秒后自动关闭
      setTimeout(() => { show.value = false; state.value = 'idle' }, 2000)
    }),
    window.api.updater.on('update:progress', (payload: any) => {
      state.value = 'downloading'
      progress.value = payload?.percent ?? 0
      speed.value = payload?.bytesPerSecond ?? 0
      transferred.value = payload?.transferred ?? 0
      total.value = payload?.total ?? 0
    }),
    window.api.updater.on('update:downloaded', (payload: any) => {
      state.value = 'downloaded'
      version.value = payload?.version || version.value
    }),
    window.api.updater.on('update:error', (payload: any) => {
      state.value = 'error'
      errorMsg.value = payload?.message || '未知错误'
      show.value = true
    })
  ]
  unsubscribers.push(...(off.filter(Boolean) as Array<() => void>))
})

onUnmounted(() => {
  unsubscribers.forEach(fn => fn())
})

async function startDownload() {
  state.value = 'downloading'
  progress.value = 0
  await window.api.updater.download()
}

async function installNow() {
  await window.api.updater.install()
}

function openRelease() {
  window.api.updater.openRelease()
}

function close() {
  show.value = false
  state.value = 'idle'
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center"
      @click.self="state !== 'downloading' && close()"
    >
      <!-- 背景遮罩 -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <!-- 弹窗主体 -->
      <div class="relative w-[420px] rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">

        <!-- 顶部渐变装饰 -->
        <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <!-- 关闭按钮 -->
        <button
          v-if="state !== 'downloading'"
          @click="close"
          class="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X class="w-3.5 h-3.5" />
        </button>

        <div class="relative p-6">

          <!-- 检查中 -->
          <template v-if="state === 'checking'">
            <div class="flex flex-col items-center text-center py-4 gap-4">
              <div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw class="w-7 h-7 text-primary animate-spin" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-foreground">正在检查更新</h3>
                <p class="text-sm text-muted-foreground mt-1">请稍候...</p>
              </div>
            </div>
          </template>

          <!-- 已是最新 -->
          <template v-else-if="state === 'up-to-date'">
            <div class="flex flex-col items-center text-center py-4 gap-4">
              <div class="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 class="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-foreground">已是最新版本</h3>
                <p class="text-sm text-muted-foreground mt-1">OpenClaw Companion 已经是最新版了</p>
              </div>
            </div>
          </template>

          <!-- 发现新版本 -->
          <template v-else-if="state === 'available'">
            <div class="flex flex-col gap-5">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap class="w-6 h-6 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-semibold text-foreground">发现新版本</h3>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/15 text-primary">
                      v{{ version }}
                    </span>
                  </div>
                  <p class="text-sm text-muted-foreground mt-1">新版本包含功能改进和问题修复</p>
                </div>
              </div>

              <div class="flex gap-2">
                <button
                  @click="startDownload"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download class="w-4 h-4" />
                  立即下载
                </button>
                <button
                  @click="openRelease"
                  class="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-muted/60 text-muted-foreground text-sm hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ExternalLink class="w-3.5 h-3.5" />
                  更新日志
                </button>
              </div>
            </div>
          </template>

          <!-- 下载中 -->
          <template v-else-if="state === 'downloading'">
            <div class="flex flex-col gap-5">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Download class="w-6 h-6 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-base font-semibold text-foreground">正在下载更新</h3>
                  <p class="text-sm text-muted-foreground mt-0.5">
                    v{{ version }} · {{ formatSpeed(speed) }}
                  </p>
                </div>
                <span class="text-2xl font-bold text-primary tabular-nums">{{ progress }}%</span>
              </div>

              <!-- 进度条 -->
              <div class="space-y-2">
                <div class="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
                    :style="{ width: `${progress}%` }"
                  />
                </div>
                <div class="flex justify-between text-[11px] text-muted-foreground">
                  <span>{{ formatBytes(transferred) }}</span>
                  <span>{{ formatBytes(total) }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- 下载完成，等待安装 -->
          <template v-else-if="state === 'downloaded'">
            <div class="flex flex-col gap-5">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 class="w-6 h-6 text-green-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-semibold text-foreground">下载完成</h3>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-500/15 text-green-500">
                      v{{ version }}
                    </span>
                  </div>
                  <p class="text-sm text-muted-foreground mt-1">安装包已就绪，重启后自动完成更新</p>
                </div>
              </div>

              <div class="flex gap-2">
                <button
                  @click="installNow"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-500/90 transition-colors"
                >
                  <RefreshCw class="w-4 h-4" />
                  立即重启安装
                </button>
                <button
                  @click="close"
                  class="px-4 py-2.5 rounded-xl bg-muted/60 text-muted-foreground text-sm hover:bg-muted hover:text-foreground transition-colors"
                >
                  稍后重启
                </button>
              </div>
            </div>
          </template>

          <!-- 错误 -->
          <template v-else-if="state === 'error'">
            <div class="flex flex-col gap-5">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertCircle class="w-6 h-6 text-destructive" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-base font-semibold text-foreground">更新失败</h3>
                  <p class="text-sm text-muted-foreground mt-1 break-all">{{ errorMsg }}</p>
                </div>
              </div>
              <button
                @click="close"
                class="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-muted/60 text-muted-foreground text-sm hover:bg-muted hover:text-foreground transition-colors"
              >
                关闭
              </button>
            </div>
          </template>

        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
