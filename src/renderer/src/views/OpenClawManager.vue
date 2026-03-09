<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  Play,
  Square,
  RefreshCw,
  Terminal,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity
} from 'lucide-vue-next'

const { t } = useI18n()

const isRunning = ref(false)
const isLoading = ref(false)
const logs = ref('')
const autoRefresh = ref(true)
let refreshTimer: number | null = null

onMounted(async () => {
  await checkStatus()
  await loadLogs()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

function startAutoRefresh() {
  if (refreshTimer) return
  refreshTimer = window.setInterval(async () => {
    if (autoRefresh.value) {
      await checkStatus()
      if (isRunning.value) await loadLogs()
    }
  }, 3000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function checkStatus() {
  try {
    const status = await window.api.openclaw.status()
    isRunning.value = status.running
  } catch (e) {
    console.error('Failed to check status:', e)
  }
}

async function startOpenClaw() {
  isLoading.value = true
  try {
    const result = await window.api.openclaw.start()
    if (result.ok) {
      isRunning.value = true
      await loadLogs()
    } else {
      alert(result.message)
    }
  } catch (e: any) {
    alert(e?.message || '启动失败')
  } finally {
    isLoading.value = false
  }
}

async function stopOpenClaw() {
  isLoading.value = true
  try {
    const result = await window.api.openclaw.stop()
    if (result.ok) {
      isRunning.value = false
    } else {
      alert(result.message)
    }
  } catch (e: any) {
    alert(e?.message || '停止失败')
  } finally {
    isLoading.value = false
  }
}

async function loadLogs() {
  try {
    const result = await window.api.openclaw.getLogs()
    if (result.ok) {
      logs.value = result.logs
    }
  } catch (e) {
    console.error('Failed to load logs:', e)
  }
}

async function clearLogs() {
  try {
    await window.api.openclaw.clearLogs()
    logs.value = ''
  } catch (e) {
    console.error('Failed to clear logs:', e)
  }
}
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-foreground tracking-tight">OpenClaw 管理</h2>
      <p class="text-sm text-muted-foreground mt-1">启动、停止 OpenClaw 并查看运行日志</p>
    </div>

    <!-- 状态卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- 运行状态 -->
      <div class="rounded-xl border bg-card p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="isRunning ? 'bg-green-500/10' : 'bg-muted'">
            <Activity class="w-5 h-5" :class="isRunning ? 'text-green-500' : 'text-muted-foreground'" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">运行状态</p>
            <p class="text-sm font-semibold" :class="isRunning ? 'text-green-500' : 'text-muted-foreground'">
              {{ isRunning ? '运行中' : '已停止' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="rounded-xl border bg-card p-5 flex items-center gap-3">
        <button
          v-if="!isRunning"
          @click="startOpenClaw"
          :disabled="isLoading"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-green-500 text-white hover:bg-green-500/90 disabled:opacity-50 transition-all"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
          <Play v-else class="w-4 h-4" />
          启动
        </button>
        <button
          v-else
          @click="stopOpenClaw"
          :disabled="isLoading"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-all"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
          <Square v-else class="w-4 h-4" />
          停止
        </button>
      </div>

      <!-- 自动刷新 -->
      <div class="rounded-xl border bg-card p-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <RefreshCw class="w-5 h-5 text-muted-foreground" :class="{ 'animate-spin': autoRefresh }" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">自动刷新</p>
            <p class="text-sm font-semibold">{{ autoRefresh ? '开启' : '关闭' }}</p>
          </div>
        </div>
        <button
          @click="autoRefresh = !autoRefresh"
          class="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
        >
          {{ autoRefresh ? '关闭' : '开启' }}
        </button>
      </div>
    </div>

    <!-- 日志区域 -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div class="flex items-center gap-2">
          <Terminal class="w-4 h-4 text-muted-foreground" />
          <h3 class="text-sm font-semibold">运行日志</h3>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="loadLogs"
            class="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
          >
            <RefreshCw class="w-3 h-3" />
            刷新
          </button>
          <button
            @click="clearLogs"
            class="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center gap-1"
          >
            <Trash2 class="w-3 h-3" />
            清空
          </button>
        </div>
      </div>
      <div class="p-4">
        <pre class="h-96 overflow-auto text-xs font-mono bg-muted/50 rounded-lg p-4 whitespace-pre-wrap break-all">{{ logs || '暂无日志' }}</pre>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="mt-6 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
      <div class="flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div class="text-sm text-blue-600 dark:text-blue-400">
          <p class="font-medium mb-1">使用提示</p>
          <ul class="space-y-1 text-xs opacity-80">
            <li>• 启动 OpenClaw 前请确保已完成模型和频道配置</li>
            <li>• 日志会自动保存到 ~/.openclaw/companion-logs.txt</li>
            <li>• 如果启动失败，请检查 Node.js 是否已安装 (22+)</li>
            <li>• 停止 OpenClaw 会中断所有正在进行的对话</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
