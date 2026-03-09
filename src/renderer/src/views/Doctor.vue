<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import FormInput from '@/components/ui/FormInput.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import {
  Stethoscope,
  Network,
  FileCheck2,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Brain
} from 'lucide-vue-next'

const config = useConfigStore()

// 端口检测
const portToCheck = ref('3000')
const portResult = ref<{ inUse: boolean; message: string } | null>(null)
const portChecking = ref(false)

async function checkPort() {
  const port = parseInt(portToCheck.value)
  if (isNaN(port) || port < 1 || port > 65535) return
  portChecking.value = true
  portResult.value = null
  try {
    portResult.value = await window.api.doctor.checkPort(port)
  } finally {
    portChecking.value = false
  }
}

// 一键体检
interface CheckItem {
  id: string
  label: string
  icon: typeof Network
  status: 'pending' | 'checking' | 'ok' | 'warn' | 'error'
  message: string
}

const checks = ref<CheckItem[]>([
  { id: 'config', label: '配置文件', icon: FileCheck2, status: 'pending', message: '等待检测' },
  { id: 'model', label: '模型配置', icon: Brain, status: 'pending', message: '等待检测' },
  { id: 'port', label: '端口状态 (3000)', icon: Network, status: 'pending', message: '等待检测' }
])

const isRunning = ref(false)

async function runFullCheck() {
  isRunning.value = true

  // 检测配置文件
  checks.value[0].status = 'checking'
  checks.value[0].message = '检测中...'
  await new Promise(r => setTimeout(r, 300))
  if (config.loaded) {
    checks.value[0].status = 'ok'
    checks.value[0].message = `配置已加载: ${config.configPath}`
  } else {
    checks.value[0].status = 'warn'
    checks.value[0].message = '未找到配置文件，请先加载'
  }

  // 检测模型配置
  checks.value[1].status = 'checking'
  checks.value[1].message = '检测中...'
  await new Promise(r => setTimeout(r, 300))
  const providers = config.providers
  const providerCount = Object.keys(providers).length
  const hasApiKey = Object.values(providers).some((p: any) => p.apiKey)
  if (providerCount > 0 && hasApiKey) {
    checks.value[1].status = 'ok'
    checks.value[1].message = `已配置 ${providerCount} 个提供商，主模型: ${config.primaryModel || '未设置'}`
  } else if (providerCount > 0) {
    checks.value[1].status = 'warn'
    checks.value[1].message = '已有提供商配置但缺少 API Key'
  } else {
    checks.value[1].status = 'error'
    checks.value[1].message = '未配置任何模型提供商'
  }

  // 端口检测
  checks.value[2].status = 'checking'
  checks.value[2].message = '检测中...'
  try {
    const r = await window.api.doctor.checkPort(3000)
    checks.value[2].status = r.inUse ? 'warn' : 'ok'
    checks.value[2].message = r.message
  } catch {
    checks.value[2].status = 'error'
    checks.value[2].message = '端口检测失败'
  }

  isRunning.value = false
}
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-foreground tracking-tight">故障急救箱</h2>
      <p class="text-sm text-muted-foreground mt-1">
        一键体检你的 OpenClaw 配置状态，快速排除常见问题。
      </p>
    </div>

    <!-- 一键体检 -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-foreground">一键体检</h3>
        <button
          @click="runFullCheck"
          :disabled="isRunning"
          class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
          :class="isRunning ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]'"
        >
          <Loader2 v-if="isRunning" class="w-4 h-4 animate-spin" />
          <Play v-else class="w-4 h-4" />
          {{ isRunning ? '检测中...' : '开始体检' }}
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="item in checks"
          :key="item.id"
          class="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/80 transition-all"
          :class="{
            'border-green-500/20': item.status === 'ok',
            'border-yellow-500/20': item.status === 'warn',
            'border-red-500/20': item.status === 'error'
          }"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50">
            <component :is="item.icon" class="w-5 h-5 text-muted-foreground" />
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium text-foreground">{{ item.label }}</h4>
            <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ item.message }}</p>
          </div>

          <div>
            <Loader2 v-if="item.status === 'checking'" class="w-5 h-5 text-primary animate-spin" />
            <CheckCircle2 v-else-if="item.status === 'ok'" class="w-5 h-5 text-green-500" />
            <AlertCircle v-else-if="item.status === 'warn'" class="w-5 h-5 text-yellow-500" />
            <XCircle v-else-if="item.status === 'error'" class="w-5 h-5 text-red-500" />
            <div v-else class="w-5 h-5 rounded-full bg-muted-foreground/20" />
          </div>
        </div>
      </div>
    </div>

    <!-- 端口检测工具 -->
    <div class="rounded-xl border border-border/50 bg-card/80 p-5">
      <h3 class="text-lg font-semibold text-foreground mb-4">端口检测工具</h3>
      <p class="text-sm text-muted-foreground mb-4">
        检测指定端口是否被占用，如果 OpenClaw 默认端口被占用，可以更换为其他端口。
      </p>

      <div class="flex items-center gap-3">
        <div class="w-32">
          <FormInput
            v-model="portToCheck"
            placeholder="端口号"
          />
        </div>
        <button
          @click="checkPort"
          :disabled="portChecking"
          class="px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          :class="portChecking
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.97]'"
        >
          <Loader2 v-if="portChecking" class="w-4 h-4 animate-spin" />
          <span v-else>检测端口</span>
        </button>

        <transition name="page">
          <div v-if="portResult" class="flex items-center gap-1.5 text-sm">
            <StatusBadge
              :status="portResult.inUse ? 'warning' : 'success'"
              :text="portResult.message"
            />
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>
