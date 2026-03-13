<script setup lang="ts">
import { ref } from 'vue'
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
  AlertTriangle,
  Wrench,
  Terminal,
  HardDrive,
  Shield,
  ExternalLink,
  Copy
} from 'lucide-vue-next'

interface DiagItem {
  id: string
  label: string
  category: string
  status: 'ok' | 'warn' | 'error'
  message: string
  fixable: boolean
  fixHint?: string
}

const checks = ref<DiagItem[]>([])
const isRunning = ref(false)
const hasRun = ref(false)
const fixingId = ref('')
const fixResult = ref<{ id: string; ok: boolean; message: string } | null>(null)

// 端口检测工具
const portToCheck = ref('3000')
const portResult = ref<{ inUse: boolean; message: string } | null>(null)
const portChecking = ref(false)

const categoryIcons: Record<string, any> = {
  '环境': Terminal,
  '核心': Shield,
  '数据': HardDrive,
  '网络': Network
}

const stats = ref({ ok: 0, warn: 0, error: 0 })

async function runFullCheck() {
  isRunning.value = true
  hasRun.value = false
  checks.value = []
  fixResult.value = null

  try {
    const results = await window.api.doctor.runDiagnostics()
    checks.value = results as DiagItem[]
    stats.value = {
      ok: results.filter((r: any) => r.status === 'ok').length,
      warn: results.filter((r: any) => r.status === 'warn').length,
      error: results.filter((r: any) => r.status === 'error').length
    }
  } catch (e: any) {
    checks.value = [{
      id: 'diag-error', label: '诊断失败', category: '系统',
      status: 'error', message: e.message || '未知错误', fixable: false
    }]
  }

  isRunning.value = false
  hasRun.value = true
}

async function handleFix(item: DiagItem) {
  fixingId.value = item.id
  fixResult.value = null
  try {
    const result = await window.api.doctor.fixItem(item.id) as { ok: boolean; message: string }
    fixResult.value = { id: item.id, ...result }
  } catch (e: any) {
    fixResult.value = { id: item.id, ok: false, message: e.message }
  }
  fixingId.value = ''
}

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

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}

const groupedChecks = ref<Record<string, DiagItem[]>>({})

function groupByCategory(items: DiagItem[]): Record<string, DiagItem[]> {
  const groups: Record<string, DiagItem[]> = {}
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return groups
}
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
        <Stethoscope class="w-6 h-6 text-primary" />
        故障急救箱
      </h2>
      <p class="text-sm text-muted-foreground mt-1">
        全面检测 OpenClaw 运行环境，自动发现并修复常见问题。
      </p>
    </div>

    <!-- 一键诊断 -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-foreground">全面诊断</h3>
        <button
          @click="runFullCheck"
          :disabled="isRunning"
          class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
          :class="isRunning ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]'"
        >
          <Loader2 v-if="isRunning" class="w-4 h-4 animate-spin" />
          <Play v-else class="w-4 h-4" />
          {{ isRunning ? '检测中...' : '开始诊断' }}
        </button>
      </div>

      <!-- 统计概览 -->
      <div v-if="hasRun && !isRunning" class="grid grid-cols-3 gap-3 mb-5">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
          <CheckCircle2 class="w-5 h-5 text-green-500" />
          <div>
            <p class="text-lg font-bold text-green-600">{{ stats.ok }}</p>
            <p class="text-[11px] text-muted-foreground">正常</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <AlertTriangle class="w-5 h-5 text-yellow-500" />
          <div>
            <p class="text-lg font-bold text-yellow-600">{{ stats.warn }}</p>
            <p class="text-[11px] text-muted-foreground">警告</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <XCircle class="w-5 h-5 text-red-500" />
          <div>
            <p class="text-lg font-bold text-red-600">{{ stats.error }}</p>
            <p class="text-[11px] text-muted-foreground">错误</p>
          </div>
        </div>
      </div>

      <!-- 未检测提示 -->
      <div v-if="!hasRun && !isRunning" class="text-center py-12 rounded-xl border border-dashed border-border/60 bg-muted/20">
        <Stethoscope class="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p class="text-sm text-muted-foreground">点击「开始诊断」检测 OpenClaw 运行环境</p>
        <p class="text-xs text-muted-foreground/60 mt-1">将检测 Node.js、npm、OpenClaw、端口、配置等</p>
      </div>

      <!-- 检测结果按分类展示 -->
      <div v-if="hasRun && checks.length > 0" class="space-y-5">
        <div
          v-for="(items, category) in groupByCategory(checks)"
          :key="category"
        >
          <div class="flex items-center gap-2 mb-2">
            <component :is="categoryIcons[category] || FileCheck2" class="w-4 h-4 text-muted-foreground" />
            <h4 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">{{ category }}</h4>
          </div>

          <div class="space-y-2">
            <div
              v-for="item in items"
              :key="item.id"
              class="p-4 rounded-xl border bg-card/80 transition-all"
              :class="{
                'border-green-500/20': item.status === 'ok',
                'border-yellow-500/20': item.status === 'warn',
                'border-red-500/20': item.status === 'error'
              }"
            >
              <div class="flex items-start gap-3">
                <!-- 状态图标 -->
                <div class="mt-0.5">
                  <CheckCircle2 v-if="item.status === 'ok'" class="w-5 h-5 text-green-500" />
                  <AlertTriangle v-else-if="item.status === 'warn'" class="w-5 h-5 text-yellow-500" />
                  <XCircle v-else class="w-5 h-5 text-red-500" />
                </div>

                <!-- 内容 -->
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-medium text-foreground">{{ item.label }}</h4>
                  <p class="text-xs text-muted-foreground mt-0.5">{{ item.message }}</p>

                  <!-- 修复建议 -->
                  <div v-if="item.fixHint && item.status !== 'ok'" class="mt-2 p-2.5 rounded-lg bg-muted/40 flex items-start gap-2">
                    <Wrench class="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div class="flex-1 min-w-0">
                      <p class="text-[11px] text-muted-foreground leading-relaxed">{{ item.fixHint }}</p>
                    </div>
                    <button
                      @click="copyText(item.fixHint!)"
                      class="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                      title="复制修复命令"
                    >
                      <Copy class="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>

                  <!-- 修复结果 -->
                  <div v-if="fixResult?.id === item.id" class="mt-2 text-xs" :class="fixResult.ok ? 'text-green-600' : 'text-red-500'">
                    {{ fixResult.message }}
                  </div>
                </div>

                <!-- 修复按钮 -->
                <button
                  v-if="item.fixable && item.status !== 'ok'"
                  @click="handleFix(item)"
                  :disabled="fixingId === item.id"
                  class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  :class="fixingId === item.id
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.97]'"
                >
                  <Loader2 v-if="fixingId === item.id" class="w-3 h-3 animate-spin" />
                  <Wrench v-else class="w-3 h-3" />
                  {{ fixingId === item.id ? '修复中...' : '一键修复' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 端口检测工具 -->
    <div class="rounded-xl border border-border/50 bg-card/80 p-5">
      <h3 class="text-lg font-semibold text-foreground mb-2">端口检测工具</h3>
      <p class="text-sm text-muted-foreground mb-4">
        检测指定端口是否被占用。OpenClaw 默认使用 3000，Gateway 默认使用 18789。
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

    <!-- 常见问题参考 -->
    <div class="mt-8 rounded-xl border border-border/50 bg-card/80 p-5">
      <h3 class="text-lg font-semibold text-foreground mb-4">常见问题速查</h3>
      <div class="space-y-3">
        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
            安装后 openclaw 命令不存在
          </summary>
          <div class="mt-2 pl-4 text-xs text-muted-foreground space-y-1 border-l-2 border-primary/20">
            <p><strong>原因:</strong> npm 全局 bin 路径不在系统 PATH 中</p>
            <p><strong>Windows:</strong> 运行 <code class="px-1 py-0.5 bg-muted rounded">npm config get prefix</code>，将结果路径添加到系统环境变量 PATH</p>
            <p><strong>macOS/Linux:</strong> install.sh 会自动将 ~/.npm-global 添加到 shell 配置，重启终端即可</p>
          </div>
        </details>

        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
            npm install -g 报 EACCES 权限错误 (Linux/macOS)
          </summary>
          <div class="mt-2 pl-4 text-xs text-muted-foreground space-y-1 border-l-2 border-primary/20">
            <p><strong>原因:</strong> npm 全局前缀指向 root 拥有的目录（如 /usr/lib）</p>
            <p><strong>解决:</strong> 执行 <code class="px-1 py-0.5 bg-muted rounded">npm config set prefix ~/.npm-global</code> 切换到用户目录</p>
            <p>然后将 <code class="px-1 py-0.5 bg-muted rounded">export PATH=~/.npm-global/bin:$PATH</code> 添加到 ~/.bashrc 或 ~/.zshrc</p>
          </div>
        </details>

        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
            Windows 安装报 spawn git ENOENT
          </summary>
          <div class="mt-2 pl-4 text-xs text-muted-foreground space-y-1 border-l-2 border-primary/20">
            <p><strong>原因:</strong> 选择了 git 安装模式但未安装 Git</p>
            <p><strong>解决:</strong> 安装 Git for Windows: <code class="px-1 py-0.5 bg-muted rounded">https://git-scm.com/download/win</code></p>
            <p>安装完成后重启 PowerShell 重试</p>
          </div>
        </details>

        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
            Gateway 端口 "already running" 冲突
          </summary>
          <div class="mt-2 pl-4 text-xs text-muted-foreground space-y-1 border-l-2 border-primary/20">
            <p><strong>原因:</strong> 另一个 Gateway 实例占用了 18789 端口</p>
            <p><strong>解决:</strong> 执行 <code class="px-1 py-0.5 bg-muted rounded">openclaw gateway restart</code> 或更换端口</p>
          </div>
        </details>

        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
            HTTP 429 rate_limit_error (Anthropic)
          </summary>
          <div class="mt-2 pl-4 text-xs text-muted-foreground space-y-1 border-l-2 border-primary/20">
            <p><strong>原因:</strong> API 速率限制或配额耗尽</p>
            <p><strong>解决:</strong> 等待限制重置、升级 API 计划、或设置备用模型（fallback model）</p>
          </div>
        </details>

        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
            卡在 "wake up my friend"
          </summary>
          <div class="mt-2 pl-4 text-xs text-muted-foreground space-y-1 border-l-2 border-primary/20">
            <p><strong>原因:</strong> Gateway 不可达或认证失败</p>
            <p><strong>解决:</strong> 执行 <code class="px-1 py-0.5 bg-muted rounded">openclaw gateway restart</code> 并检查日志</p>
          </div>
        </details>

        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors">
            config.apply 清空了配置
          </summary>
          <div class="mt-2 pl-4 text-xs text-muted-foreground space-y-1 border-l-2 border-primary/20">
            <p><strong>原因:</strong> config.apply 会替换整个配置对象，缺失的键会被删除</p>
            <p><strong>解决:</strong> 从备份恢复；小改动建议用 <code class="px-1 py-0.5 bg-muted rounded">openclaw config set</code></p>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>
