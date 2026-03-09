<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  Archive,
  Download,
  Upload,
  FolderOpen,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Copy,
  ArrowRight,
  Clock,
  Settings,
  Play,
  Trash2,
  FolderSync
} from 'lucide-vue-next'

const { t } = useI18n()

const backupInfo = ref<{
  ok: boolean
  path?: string
  fileCount?: number
  totalSize?: number
  sizeDisplay?: string
  message?: string
} | null>(null)

const loading = ref(false)
const actionResult = ref<{ ok: boolean; message: string } | null>(null)

// 自动备份设置
const autoBackupSettings = ref<{
  enabled: boolean
  interval: string
  backupDir: string
  keepCount: number
}>({
  enabled: false,
  interval: 'daily',
  backupDir: '',
  keepCount: 10
})

const autoBackups = ref<Array<{
  name: string
  path: string
  size: number
  sizeDisplay: string
  created: string
  createdDisplay: string
}>>([])

const autoBackupLoading = ref(false)

onMounted(async () => {
  await refreshInfo()
  await loadAutoBackupSettings()
  await loadAutoBackups()
})

async function refreshInfo() {
  backupInfo.value = await window.api.backup.getInfo()
}

async function loadAutoBackupSettings() {
  const settings = await window.api.autoBackup.getSettings()
  autoBackupSettings.value = settings
}

async function loadAutoBackups() {
  const result = await window.api.autoBackup.list()
  if (result.ok) {
    autoBackups.value = result.backups
  }
}

async function handleBackup() {
  loading.value = true
  actionResult.value = null
  try {
    const result = await window.api.backup.create()
    actionResult.value = result
    await refreshInfo()
  } finally {
    loading.value = false
  }
}

async function handleRestore() {
  loading.value = true
  actionResult.value = null
  try {
    const result = await window.api.backup.restore()
    actionResult.value = result
    await refreshInfo()
  } finally {
    loading.value = false
  }
}

async function handleOpenFolder() {
  await window.api.backup.openFolder()
}

// 自动备份相关
async function toggleAutoBackup() {
  await saveAutoBackupSettings()
  if (autoBackupSettings.value.enabled) {
    // 启用时立即执行一次备份
    await handleRunAutoBackup()
  }
}

async function saveAutoBackupSettings() {
  await window.api.autoBackup.setSettings(autoBackupSettings.value)
}

async function handleSelectBackupDir() {
  const result = await window.api.autoBackup.selectDir()
  if (result.ok && result.path) {
    autoBackupSettings.value.backupDir = result.path
    await saveAutoBackupSettings()
  }
}

async function handleRunAutoBackup() {
  autoBackupLoading.value = true
  actionResult.value = null
  try {
    const result = await window.api.autoBackup.runNow()
    actionResult.value = result
    await loadAutoBackups()
  } finally {
    autoBackupLoading.value = false
  }
}

const intervalOptions = computed(() => [
  { value: 'daily', label: t('backup.intervalDaily') },
  { value: 'weekly', label: t('backup.intervalWeekly') },
  { value: 'monthly', label: t('backup.intervalMonthly') }
])

const activeTab = ref<'backup' | 'migrate'>('backup')
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-foreground tracking-tight">{{ t('backup.title') }}</h2>
      <p class="text-sm text-muted-foreground mt-1">{{ t('backup.subtitle') }}</p>
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-1 mb-6 p-1 rounded-lg bg-muted/40 w-fit">
      <button
        @click="activeTab = 'backup'"
        class="px-4 py-2 rounded-md text-sm font-medium transition-all"
        :class="activeTab === 'backup'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'"
      >
        <div class="flex items-center gap-2">
          <Archive class="w-4 h-4" />
          {{ t('backup.backupTab') }}
        </div>
      </button>
      <button
        @click="activeTab = 'migrate'"
        class="px-4 py-2 rounded-md text-sm font-medium transition-all"
        :class="activeTab === 'migrate'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'"
      >
        <div class="flex items-center gap-2">
          <HardDrive class="w-4 h-4" />
          {{ t('backup.migrateTab') }}
        </div>
      </button>
    </div>

    <!-- 操作结果提示 -->
    <transition name="page">
      <div v-if="actionResult" class="mb-6 p-4 rounded-xl border" :class="actionResult.ok ? 'border-green-500/20 bg-green-500/5' : 'border-destructive/20 bg-destructive/5'">
        <div class="flex items-center gap-3">
          <CheckCircle2 v-if="actionResult.ok" class="w-5 h-5 text-green-500" />
          <AlertCircle v-else class="w-5 h-5 text-destructive" />
          <p class="text-sm" :class="actionResult.ok ? 'text-green-500' : 'text-destructive'">
            {{ actionResult.message }}
          </p>
        </div>
      </div>
    </transition>

    <!-- 备份面板 -->
    <div v-if="activeTab === 'backup'" class="space-y-6">
      <!-- 当前数据状态 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <h3 class="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <HardDrive class="w-4 h-4 text-primary" />
          {{ t('backup.dataStatus') }}
        </h3>

        <div v-if="backupInfo?.ok" class="grid grid-cols-3 gap-4">
          <div class="p-4 rounded-lg bg-muted/40">
            <p class="text-xs text-muted-foreground">{{ t('backup.dataPath') }}</p>
            <p class="text-sm font-medium text-foreground mt-1 truncate" :title="backupInfo.path">{{ backupInfo.path }}</p>
          </div>
          <div class="p-4 rounded-lg bg-muted/40">
            <p class="text-xs text-muted-foreground">{{ t('backup.fileCount') }}</p>
            <p class="text-sm font-medium text-foreground mt-1">{{ backupInfo.fileCount }} {{ t('backup.files') }}</p>
          </div>
          <div class="p-4 rounded-lg bg-muted/40">
            <p class="text-xs text-muted-foreground">{{ t('backup.totalSize') }}</p>
            <p class="text-sm font-medium text-foreground mt-1">{{ backupInfo.sizeDisplay }}</p>
          </div>
        </div>

        <div v-else class="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <div class="flex items-center gap-2">
            <AlertCircle class="w-4 h-4 text-yellow-500" />
            <p class="text-sm text-yellow-500">{{ t('backup.noData') }}</p>
          </div>
        </div>
      </div>

      <!-- 自动备份设置 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <h3 class="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Clock class="w-4 h-4 text-primary" />
          {{ t('backup.autoBackupTitle') }}
        </h3>
        <p class="text-xs text-muted-foreground mb-4">{{ t('backup.autoBackupDesc') }}</p>

        <div class="space-y-4">
          <!-- 启用开关 -->
          <label class="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <span class="text-sm font-medium text-foreground">{{ t('backup.enableAutoBackup') }}</span>
            <input
              type="checkbox"
              v-model="autoBackupSettings.enabled"
              @change="toggleAutoBackup"
              class="w-5 h-5 rounded border-border/50 bg-input text-primary focus:ring-primary/20"
            />
          </label>

          <!-- 备份频率 -->
          <div class="flex items-center gap-4">
            <span class="text-sm text-muted-foreground w-24">{{ t('backup.backupInterval') }}</span>
            <select
              v-model="autoBackupSettings.interval"
              @change="saveAutoBackupSettings"
              :disabled="!autoBackupSettings.enabled"
              class="flex-1 px-3 py-2 rounded-lg border border-border/50 bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option v-for="opt in intervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <!-- 备份位置 -->
          <div class="flex items-center gap-4">
            <span class="text-sm text-muted-foreground w-24">{{ t('backup.backupLocation') }}</span>
            <div class="flex-1 flex gap-2">
              <input
                type="text"
                :value="autoBackupSettings.backupDir"
                readonly
                class="flex-1 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 text-sm text-muted-foreground"
              />
              <button
                @click="handleSelectBackupDir"
                class="px-3 py-2 rounded-lg text-sm border border-border/50 hover:bg-muted/60 transition-colors flex items-center gap-1"
              >
                <FolderSync class="w-4 h-4" />
                {{ t('backup.selectLocation') }}
              </button>
            </div>
          </div>

          <!-- 保留数量 -->
          <div class="flex items-center gap-4">
            <span class="text-sm text-muted-foreground w-24">{{ t('backup.keepCount') }}</span>
            <input
              type="number"
              v-model.number="autoBackupSettings.keepCount"
              @change="saveAutoBackupSettings"
              min="1"
              max="100"
              :disabled="!autoBackupSettings.enabled"
              class="w-20 px-3 py-2 rounded-lg border border-border/50 bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <span class="text-xs text-muted-foreground">{{ t('backup.keepCountDesc', { count: autoBackupSettings.keepCount }) }}</span>
          </div>

          <!-- 文件命名格式提示 -->
          <div class="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <p class="text-xs text-blue-500/80">{{ t('backup.namingFormat') }}</p>
          </div>

          <!-- 立即备份按钮 -->
          <div class="flex items-center gap-3 pt-2">
            <button
              @click="handleRunAutoBackup"
              :disabled="autoBackupLoading || !backupInfo?.ok"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Loader2 v-if="autoBackupLoading" class="w-4 h-4 animate-spin" />
              <Play v-else class="w-4 h-4" />
              {{ autoBackupLoading ? t('backup.running') : t('backup.runNow') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 最近自动备份列表 -->
      <div v-if="autoBackupSettings.enabled" class="rounded-xl border border-border/50 bg-card/80 p-6">
        <h3 class="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Archive class="w-4 h-4 text-primary" />
          {{ t('backup.recentBackups') }}
        </h3>

        <div v-if="autoBackups.length > 0" class="space-y-2">
          <div
            v-for="backup in autoBackups"
            :key="backup.path"
            class="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ backup.name }}</p>
              <p class="text-xs text-muted-foreground">{{ backup.createdDisplay }}</p>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-xs text-muted-foreground">{{ backup.sizeDisplay }}</span>
            </div>
          </div>
        </div>

        <div v-else class="p-4 rounded-lg bg-muted/30 text-center">
          <p class="text-sm text-muted-foreground">{{ t('backup.noBackups') }}</p>
        </div>
      </div>

      <!-- 手动备份操作 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <h3 class="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Download class="w-4 h-4 text-primary" />
          {{ t('backup.createBackup') }}
        </h3>
        <p class="text-xs text-muted-foreground mb-4">{{ t('backup.createBackupDesc') }}</p>

        <div class="flex items-center gap-3">
          <button
            @click="handleBackup"
            :disabled="loading || !backupInfo?.ok"
            class="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            {{ loading ? t('backup.backing') : t('backup.startBackup') }}
          </button>

          <button
            @click="handleOpenFolder"
            v-if="backupInfo?.ok"
            class="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-2"
          >
            <FolderOpen class="w-4 h-4" />
            {{ t('backup.openFolder') }}
          </button>
        </div>
      </div>

      <!-- 恢复操作 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <h3 class="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Upload class="w-4 h-4 text-primary" />
          {{ t('backup.restoreBackup') }}
        </h3>
        <p class="text-xs text-muted-foreground mb-4">{{ t('backup.restoreBackupDesc') }}</p>

        <button
          @click="handleRestore"
          :disabled="loading"
          class="px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-muted/60 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <Upload v-else class="w-4 h-4" />
          {{ loading ? t('backup.restoring') : t('backup.selectBackupFile') }}
        </button>
      </div>
    </div>

    <!-- 迁移面板 -->
    <div v-if="activeTab === 'migrate'" class="space-y-6">
      <!-- 迁移说明 -->
      <div class="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div class="flex items-start gap-3">
          <Info class="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 class="text-sm font-semibold text-foreground mb-1">{{ t('backup.migrateInfo') }}</h3>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ t('backup.migrateInfoDesc') }}</p>
          </div>
        </div>
      </div>

      <!-- 步骤 1: 在旧设备备份 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-sm font-bold text-primary">1</span>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground">{{ t('backup.step1Title') }}</h3>
            <p class="text-xs text-muted-foreground">{{ t('backup.step1Desc') }}</p>
          </div>
        </div>
        <div class="ml-11 space-y-2">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight class="w-3 h-3" />
            <span>{{ t('backup.step1a') }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight class="w-3 h-3" />
            <span>{{ t('backup.step1b') }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight class="w-3 h-3" />
            <span>{{ t('backup.step1c') }}</span>
          </div>
        </div>
      </div>

      <!-- 步骤 2: 传输文件 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-sm font-bold text-primary">2</span>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground">{{ t('backup.step2Title') }}</h3>
            <p class="text-xs text-muted-foreground">{{ t('backup.step2Desc') }}</p>
          </div>
        </div>
        <div class="ml-11 space-y-2">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Copy class="w-3 h-3" />
            <span>{{ t('backup.step2a') }}</span>
          </div>
        </div>
      </div>

      <!-- 步骤 3: 在新设备安装 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-sm font-bold text-primary">3</span>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground">{{ t('backup.step3Title') }}</h3>
            <p class="text-xs text-muted-foreground">{{ t('backup.step3Desc') }}</p>
          </div>
        </div>
        <div class="ml-11 space-y-2">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight class="w-3 h-3" />
            <span>{{ t('backup.step3a') }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight class="w-3 h-3" />
            <span>{{ t('backup.step3b') }}</span>
          </div>
        </div>
      </div>

      <!-- 步骤 4: 恢复备份 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-sm font-bold text-primary">4</span>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground">{{ t('backup.step4Title') }}</h3>
            <p class="text-xs text-muted-foreground">{{ t('backup.step4Desc') }}</p>
          </div>
        </div>
        <div class="ml-11 space-y-2">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight class="w-3 h-3" />
            <span>{{ t('backup.step4a') }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight class="w-3 h-3" />
            <span>{{ t('backup.step4b') }}</span>
          </div>
        </div>

        <div class="ml-11 mt-4">
          <button
            @click="handleRestore"
            :disabled="loading"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Upload class="w-4 h-4" />
            {{ t('backup.restoreHere') }}
          </button>
        </div>
      </div>

      <!-- 步骤 5: 验证 -->
      <div class="rounded-xl border border-border/50 bg-card/80 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 class="w-4 h-4 text-green-500" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground">{{ t('backup.step5Title') }}</h3>
            <p class="text-xs text-muted-foreground">{{ t('backup.step5Desc') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
