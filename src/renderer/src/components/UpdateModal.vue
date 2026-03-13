<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Download, CheckCircle2, AlertCircle, RefreshCw, X, Zap, ArrowUpCircle, Sparkles } from 'lucide-vue-next'

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date'

const show = ref(false)
const state = ref<UpdateState>('idle')
const version = ref('')
const releaseNotes = ref('')
const errorMsg = ref('')
const progress = ref(0)
const speed = ref(0)
const transferred = ref(0)
const total = ref(0)

// 内置的版本更新日志
const changelog: Record<string, { title: string; items: string[] }> = {
  '1.1.3-beta': {
    title: '修复 macOS 自动更新重启无效',
    items: [
      '使用 default 目标替代单独的 dmg+zip',
      '添加 ad-hoc 签名配置（无需 Apple 开发者账号）',
      '禁用 Gatekeeper 评估',
      '修复更新下载成功但重启后版本未变的问题'
    ]
  },
  '1.1.2-beta': {
    title: '修复自动更新文件名',
    items: [
      '修复 latest-mac.yml 与实际文件名不匹配的问题',
      '统一 productName 为 OpenClaw-Companion（无空格）',
      '自动更新功能现在应该可以正常工作了'
    ]
  },
  '1.1.1-beta': {
    title: '测试更新',
    items: [
      '测试 macOS 自动更新功能',
      '验证 ZIP 文件下载和安装流程',
      '如果看到这个更新说明自动更新已修复成功！'
    ]
  },
  '1.1.0-beta': {
    title: '重大更新',
    items: [
      '修复 macOS 自动更新失败（ZIP file not provided）',
      '全新龙虾应用图标',
      '重写故障急救箱：10 项环境自动检测 + 一键修复',
      '常见问题速查（7 个常见故障及解决方案）',
      '启动不再弹出更新弹窗，改为红点提示',
      '新增关于页面',
      '默认主题改为明亮模式',
      '修复 macOS 重复启动报 IPC handler 错误'
    ]
  },
  '1.0.9-beta': {
    title: '故障急救 & 图标更新',
    items: [
      '龙虾图标替换',
      '静默更新检测，不再弹窗打扰',
      '全面故障诊断功能重写'
    ]
  }
}

const currentChangelog = computed(() => {
  const ver = version.value
  return changelog[ver] || null
})

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
      releaseNotes.value = payload?.releaseNotes || ''
      show.value = true
    }),
    window.api.updater.on('update:not-available', () => {
      state.value = 'up-to-date'
      show.value = true
      setTimeout(() => { show.value = false; state.value = 'idle' }, 2500)
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
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <!-- 弹窗主体 -->
      <div class="relative w-[460px] max-h-[80vh] rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden flex flex-col">

        <!-- 关闭按钮 -->
        <button
          v-if="state !== 'downloading'"
          @click="close"
          class="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X class="w-3.5 h-3.5" />
        </button>

        <!-- ====== 检查中 ====== -->
        <div v-if="state === 'checking'" class="p-8">
          <div class="flex flex-col items-center text-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <RefreshCw class="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-foreground">正在检查更新</h3>
              <p class="text-sm text-muted-foreground mt-1">正在连接更新服务器...</p>
            </div>
          </div>
        </div>

        <!-- ====== 已是最新 ====== -->
        <div v-else-if="state === 'up-to-date'" class="p-8">
          <div class="flex flex-col items-center text-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 class="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-foreground">已是最新版本</h3>
              <p class="text-sm text-muted-foreground mt-1">当前版本已经是最新的了</p>
            </div>
          </div>
        </div>

        <!-- ====== 发现新版本 ====== -->
        <template v-else-if="state === 'available'">
          <!-- 顶部 banner -->
          <div class="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <ArrowUpCircle class="w-7 h-7 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-lg font-bold text-foreground">发现新版本</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    v{{ version }}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground mt-0.5">有新的更新可供安装</p>
              </div>
            </div>
          </div>

          <!-- 更新日志 -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <template v-if="currentChangelog">
              <div class="flex items-center gap-2 mb-3">
                <Sparkles class="w-4 h-4 text-primary" />
                <h4 class="text-sm font-semibold text-foreground">{{ currentChangelog.title }}</h4>
              </div>
              <ul class="space-y-2">
                <li
                  v-for="(item, i) in currentChangelog.items"
                  :key="i"
                  class="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                  <span>{{ item }}</span>
                </li>
              </ul>
            </template>
            <template v-else>
              <p class="text-sm text-muted-foreground">新版本包含功能改进和问题修复。</p>
            </template>
          </div>

          <!-- 操作按钮 -->
          <div class="px-6 pb-5 pt-2 flex gap-2 border-t border-border/30">
            <button
              @click="startDownload"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              <Download class="w-4 h-4" />
              立即更新
            </button>
            <button
              @click="close"
              class="px-4 py-2.5 rounded-xl bg-muted/60 text-muted-foreground text-sm hover:bg-muted hover:text-foreground transition-colors"
            >
              稍后再说
            </button>
          </div>
        </template>

        <!-- ====== 下载中 ====== -->
        <div v-else-if="state === 'downloading'" class="p-6">
          <div class="flex flex-col gap-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Download class="w-6 h-6 text-primary animate-bounce" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-foreground">正在下载 v{{ version }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">{{ formatSpeed(speed) }}</p>
              </div>
              <span class="text-2xl font-bold text-primary tabular-nums">{{ progress }}%</span>
            </div>

            <!-- 进度条 -->
            <div class="space-y-2">
              <div class="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
                  :style="{ width: `${progress}%` }"
                />
              </div>
              <div class="flex justify-between text-[11px] text-muted-foreground">
                <span>{{ formatBytes(transferred) }} / {{ formatBytes(total) }}</span>
                <span>{{ formatSpeed(speed) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== 下载完成 ====== -->
        <div v-else-if="state === 'downloaded'" class="p-6">
          <div class="flex flex-col gap-5">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 class="w-7 h-7 text-green-500" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold text-foreground">下载完成</h3>
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-500/15 text-green-600">
                    v{{ version }}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground mt-1">重启应用即可完成更新</p>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                @click="installNow"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors active:scale-[0.98]"
              >
                <RefreshCw class="w-4 h-4" />
                立即重启更新
              </button>
              <button
                @click="close"
                class="px-4 py-2.5 rounded-xl bg-muted/60 text-muted-foreground text-sm hover:bg-muted hover:text-foreground transition-colors"
              >
                稍后
              </button>
            </div>
          </div>
        </div>

        <!-- ====== 错误 ====== -->
        <div v-else-if="state === 'error'" class="p-6">
          <div class="flex flex-col gap-5">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertCircle class="w-6 h-6 text-destructive" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-foreground">更新失败</h3>
                <p class="text-xs text-muted-foreground mt-1.5 p-2.5 rounded-lg bg-muted/40 break-all font-mono leading-relaxed max-h-24 overflow-y-auto">
                  {{ errorMsg }}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="close"
                class="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl bg-muted/60 text-muted-foreground text-sm hover:bg-muted hover:text-foreground transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
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
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}
</style>
