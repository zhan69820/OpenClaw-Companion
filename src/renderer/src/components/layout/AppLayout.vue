<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useI18n } from '@/composables/useI18n'
import {
  Brain,
  Radio,
  Stethoscope,
  FileCode2,
  Archive,
  Trash2,
  Minus,
  Square,
  X,
  Moon,
  Sun,
  Save,
  FolderOpen,
  Globe,
  RefreshCw
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const config = useConfigStore()
const { t, locale } = useI18n()

const isDark = ref(true)
const showLangMenu = ref(false)

const languages = [
  { code: 'zh' as const, label: '中文' },
  { code: 'en' as const, label: 'English' },
  { code: 'es' as const, label: 'Español' }
]

const currentLangLabel = computed(() => {
  return languages.find(l => l.code === locale.value)?.label || '中文'
})

function setLanguage(code: 'zh' | 'en' | 'es') {
  locale.value = code
  showLangMenu.value = false
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

const navItems = computed(() => [
  { path: '/llm', label: t('nav.llm'), icon: Brain, desc: 'LLM Hub' },
  { path: '/channels', label: t('nav.channels'), icon: Radio, desc: 'Channels' },
  { path: '/backup', label: t('nav.backup'), icon: Archive, desc: 'Backup' },
  { path: '/doctor', label: t('nav.doctor'), icon: Stethoscope, desc: 'Doctor' },
  { path: '/preview', label: t('nav.preview'), icon: FileCode2, desc: 'Preview' },
  { path: '/uninstall', label: t('nav.uninstall'), icon: Trash2, desc: 'Uninstall' }
])

async function handleSave() {
  const result = await config.save()
  if (!result.ok) {
    alert(result.message)
  }
}

async function handleLoad() {
  await config.loadFromFile()
}

// 窗口控制
function winMinimize() { window.api.window.minimize() }
function winMaximize() { window.api.window.maximize() }
function winClose() { window.api.window.close() }

// 点击页面其他位置关闭语言菜单
function handleClickOutside() {
  showLangMenu.value = false
}

// 检查更新
async function checkForUpdates() {
  try {
    await window.api.updater.check()
  } catch (e) {
    console.error('Failed to check for updates:', e)
  }
}

onMounted(() => {
  document.documentElement.classList.add('dark')
  document.addEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden select-none">
    <!-- 自定义标题栏 -->
    <header
      class="drag-region flex items-center justify-between h-10 px-4 border-b border-border/50 bg-background/80 backdrop-blur-md shrink-0 z-50"
    >
      <div class="flex items-center gap-2 no-drag">
        <div class="w-5 h-5 rounded-md bg-primary flex items-center justify-center">
          <span class="text-[10px] font-bold text-primary-foreground">OC</span>
        </div>
        <span class="text-xs font-semibold text-foreground/80">OpenClaw Companion</span>
      </div>

      <!-- 右侧：语言切换 + 主题切换 + 窗口控制 -->
      <div class="flex items-center gap-1 no-drag">
        <!-- 语言切换 -->
        <div class="relative" @click.stop>
          <button
            @click="showLangMenu = !showLangMenu"
            class="h-7 px-2 flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Globe class="w-3.5 h-3.5" />
            <span>{{ currentLangLabel }}</span>
          </button>
          <transition name="page">
            <div
              v-if="showLangMenu"
              class="absolute top-full right-0 mt-1 p-1 rounded-lg bg-card border border-border/50 shadow-lg z-50 min-w-[100px]"
            >
              <button
                v-for="lang in languages"
                :key="lang.code"
                @click="setLanguage(lang.code)"
                class="w-full px-3 py-1.5 rounded text-xs text-left transition-colors"
                :class="locale === lang.code ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60'"
              >
                {{ lang.label }}
              </button>
            </div>
          </transition>
        </div>

        <!-- 主题切换 -->
        <button
          @click="toggleTheme"
          class="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          :title="isDark ? t('header.lightMode') : t('header.darkMode')"
        >
          <Moon v-if="isDark" class="w-3.5 h-3.5" />
          <Sun v-else class="w-3.5 h-3.5" />
        </button>

        <!-- 分隔线 -->
        <div class="w-px h-4 bg-border/50 mx-1"></div>

        <!-- 窗口控制按钮 -->
        <button
          @click="winMinimize"
          class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <Minus class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          @click="winMaximize"
          class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <Square class="w-3 h-3 text-muted-foreground" />
        </button>
        <button
          @click="winClose"
          class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-destructive/90 hover:text-destructive-foreground transition-colors"
        >
          <X class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- 侧边栏 -->
      <aside class="glass w-56 shrink-0 border-r border-border/30 flex flex-col">
        <!-- Logo区 -->
        <div class="px-5 pt-5 pb-4">
          <h1 class="text-lg font-bold text-foreground tracking-tight">OpenClaw</h1>
          <p class="text-[11px] text-muted-foreground mt-0.5">Companion v1.0</p>
        </div>

        <!-- 导航 -->
        <nav class="flex-1 px-3 space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
            :class="[
              route.path === item.path
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            ]"
          >
            <component
              :is="item.icon"
              class="w-[18px] h-[18px] shrink-0 transition-colors"
              :class="route.path === item.path ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'"
            />
            <div class="flex flex-col">
              <span>{{ item.label }}</span>
              <span class="text-[10px] text-muted-foreground/60">{{ item.desc }}</span>
            </div>
            <div
              v-if="route.path === item.path"
              class="ml-auto w-1 h-4 rounded-full bg-primary"
            />
          </router-link>
        </nav>

        <!-- 底部操作 -->
        <div class="p-3 space-y-2 border-t border-border/30">
          <!-- 配置文件状态 -->
          <div class="px-3 py-2 rounded-lg bg-muted/40">
            <div class="flex items-center gap-2">
              <div
                class="w-2 h-2 rounded-full shrink-0"
                :class="config.loaded ? 'bg-green-500 animate-pulse-dot' : 'bg-yellow-500'"
              />
              <span class="text-[11px] text-muted-foreground truncate">
                {{ config.loaded ? t('sidebar.configLoaded') : t('sidebar.configNotLoaded') }}
              </span>
            </div>
            <p
              v-if="config.configPath"
              class="text-[10px] text-muted-foreground/50 mt-1 truncate"
              :title="config.configPath"
            >
              {{ config.configPath }}
            </p>
          </div>

          <div class="flex gap-2">
            <button
              @click="handleLoad"
              class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted/60 text-foreground hover:bg-muted transition-colors"
            >
              <FolderOpen class="w-3.5 h-3.5" />
              {{ t('sidebar.load') }}
            </button>
            <button
              @click="handleSave"
              class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              :class="config.isDirty
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted/60 text-muted-foreground'"
            >
              <Save class="w-3.5 h-3.5" />
              {{ t('sidebar.save') }}
            </button>
          </div>

          <!-- 检查更新按钮 -->
          <button
            @click="checkForUpdates"
            class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="检查软件更新"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            检查更新
          </button>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="flex-1 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>
