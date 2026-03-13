<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Package, Github, Heart, Sparkles, Zap, Shield, Code2, ExternalLink } from 'lucide-vue-next'

const version = ref(__APP_VERSION__)
const electronVersion = ref('')
const nodeVersion = ref('')

onMounted(async () => {
  electronVersion.value = (window as any).process?.versions?.electron || ''
  nodeVersion.value = (window as any).process?.versions?.node || ''
})

const features = [
  { icon: Zap, title: 'LLM 配置管理', desc: '支持多种 LLM 提供商的统一配置界面' },
  { icon: Shield, title: '故障诊断', desc: '一键检测端口冲突、配置错误等常见问题' },
  { icon: Package, title: '备份迁移', desc: '完整的配置备份与恢复功能' },
  { icon: Code2, title: '配置预览', desc: '实时预览生成的 OpenClaw 配置文件' }
]
</script>

<template>
  <div class="p-8 max-w-3xl mx-auto">
    <!-- 头部 -->
    <div class="text-center mb-10">
      <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
        <span class="text-2xl font-bold text-white">OC</span>
      </div>
      <h1 class="text-2xl font-bold text-foreground mb-1">OpenClaw Companion</h1>
      <p class="text-sm text-muted-foreground">让 OpenClaw 配置变得简单</p>
      <div class="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60">
        <span class="w-2 h-2 rounded-full bg-green-500"></span>
        <span class="text-xs font-medium text-muted-foreground">v{{ version }}</span>
      </div>
    </div>

    <!-- 功能介绍 -->
    <div class="grid grid-cols-2 gap-4 mb-10">
      <div
        v-for="feature in features"
        :key="feature.title"
        class="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
      >
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
          <component :is="feature.icon" class="w-5 h-5 text-primary" />
        </div>
        <h3 class="font-medium text-foreground mb-1">{{ feature.title }}</h3>
        <p class="text-xs text-muted-foreground">{{ feature.desc }}</p>
      </div>
    </div>

    <!-- 技术信息 -->
    <div class="rounded-xl bg-muted/40 p-5 mb-8">
      <h3 class="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <Code2 class="w-4 h-4 text-muted-foreground" />
        技术信息
      </h3>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-xs text-muted-foreground mb-1">应用版本</p>
          <p class="text-sm font-medium text-foreground">v{{ version }}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground mb-1">Electron</p>
          <p class="text-sm font-medium text-foreground">{{ electronVersion || '-' }}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground mb-1">Node.js</p>
          <p class="text-sm font-medium text-foreground">{{ nodeVersion || '-' }}</p>
        </div>
      </div>
    </div>

    <!-- 链接 -->
    <div class="flex justify-center gap-4 mb-8">
      <a
        href="https://openclaw.n8ndx.com"
        target="_blank"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:bg-muted/60 transition-colors text-sm"
      >
        <ExternalLink class="w-4 h-4 text-muted-foreground" />
        <span>官方网站</span>
      </a>
      <a
        href="https://github.com/zhan69820/OpenClaw-Companion"
        target="_blank"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:bg-muted/60 transition-colors text-sm"
      >
        <Github class="w-4 h-4 text-muted-foreground" />
        <span>GitHub</span>
      </a>
    </div>

    <!-- 版权 -->
    <div class="text-center">
      <p class="text-xs text-muted-foreground/60 flex items-center justify-center gap-1">
        Made with <Heart class="w-3 h-3 text-red-500 fill-red-500" /> by OpenClaw Team
      </p>
      <p class="text-[10px] text-muted-foreground/40 mt-2">
        © 2025 OpenClaw Companion. All rights reserved.
      </p>
    </div>
  </div>
</template>
