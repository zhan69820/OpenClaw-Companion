<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { Copy, Download, Upload, RotateCcw, Check } from 'lucide-vue-next'

const config = useConfigStore()
const previewText = ref('')
const copied = ref(false)

function refresh() {
  previewText.value = JSON.stringify(config.data, null, 2)
}

onMounted(refresh)
watch(() => config.data, refresh, { deep: true })

function copyToClipboard() {
  navigator.clipboard.writeText(previewText.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function handleExport() {
  await window.api.config.export(JSON.parse(JSON.stringify(config.data)))
}

async function handleBackup() {
  const result = await window.api.config.backup()
  if (result.ok) {
    alert(result.message)
  } else {
    alert(result.message)
  }
}
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-foreground tracking-tight">配置预览</h2>
      <p class="text-sm text-muted-foreground mt-1">
        查看完整的 OpenClaw 配置文件内容。支持导出和备份。
      </p>
    </div>

    <!-- 操作栏 -->
    <div class="flex items-center gap-2 mb-4">
      <button
        @click="refresh"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted/60 text-foreground hover:bg-muted transition-colors"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        刷新
      </button>
      <button
        @click="copyToClipboard"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted/60 text-foreground hover:bg-muted transition-colors"
      >
        <Check v-if="copied" class="w-3.5 h-3.5 text-green-500" />
        <Copy v-else class="w-3.5 h-3.5" />
        {{ copied ? '已复制' : '复制' }}
      </button>
      <button
        @click="handleExport"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted/60 text-foreground hover:bg-muted transition-colors"
      >
        <Download class="w-3.5 h-3.5" />
        导出
      </button>
      <button
        @click="handleBackup"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted/60 text-foreground hover:bg-muted transition-colors"
      >
        <Upload class="w-3.5 h-3.5" />
        备份
      </button>

      <div class="ml-auto text-xs text-muted-foreground">
        {{ config.configPath || '未加载配置文件' }}
      </div>
    </div>

    <!-- 预览区 -->
    <div class="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
      <pre
        class="p-5 text-sm text-foreground/80 font-mono leading-relaxed overflow-auto max-h-[calc(100vh-280px)]"
      >{{ previewText }}</pre>
    </div>
  </div>
</template>
