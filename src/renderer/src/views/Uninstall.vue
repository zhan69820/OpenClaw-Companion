<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  FolderX,
  Package,
  Archive
} from 'lucide-vue-next'

const { t } = useI18n()

interface UninstallItem {
  id: string
  label: string
  path: string
  exists: boolean
  size: string
  removable: boolean
  defaultChecked: boolean
}

const scanning = ref(true)
const items = ref<UninstallItem[]>([])
const selected = ref<Set<string>>(new Set())
const uninstalling = ref(false)
const results = ref<Array<{ id: string; ok: boolean; message: string }> | null>(null)
const showConfirm = ref(false)

const iconMap: Record<string, any> = {
  'npm-package': Package,
  'config-dir': FolderX,
  'backups-dir': Archive
}

onMounted(async () => {
  await scan()
})

async function scan() {
  scanning.value = true
  results.value = null
  try {
    const res = await window.api.uninstall.scan()
    if (res.ok) {
      items.value = res.items
      // 按默认勾选初始化
      selected.value = new Set(res.items.filter((i: UninstallItem) => i.defaultChecked && i.exists).map((i: UninstallItem) => i.id))
    }
  } finally {
    scanning.value = false
  }
}

function toggleItem(id: string) {
  if (selected.value.has(id)) {
    selected.value.delete(id)
  } else {
    selected.value.add(id)
  }
  // 触发响应式更新
  selected.value = new Set(selected.value)
}

const hasSelection = computed(() => selected.value.size > 0)
const existingItems = computed(() => items.value.filter(i => i.exists))

async function executeUninstall() {
  showConfirm.value = false
  uninstalling.value = true
  results.value = null
  try {
    const res = await window.api.uninstall.execute([...selected.value])
    results.value = res.results
    // 卸载完成后重新扫描
    await scan()
  } finally {
    uninstalling.value = false
  }
}
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-foreground tracking-tight">{{ t('uninstall.title') }}</h2>
      <p class="text-sm text-muted-foreground mt-1">{{ t('uninstall.subtitle') }}</p>
    </div>

    <!-- 警告横幅 -->
    <div class="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
        <div>
          <h3 class="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{{ t('uninstall.warning') }}</h3>
          <p class="text-xs text-muted-foreground mt-1 leading-relaxed">{{ t('uninstall.warningDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- 操作结果 -->
    <transition name="page">
      <div v-if="results" class="mb-6 space-y-2">
        <div
          v-for="r in results"
          :key="r.id"
          class="p-3 rounded-lg border"
          :class="r.ok ? 'border-green-500/20 bg-green-500/5' : 'border-destructive/20 bg-destructive/5'"
        >
          <div class="flex items-center gap-2">
            <CheckCircle2 v-if="r.ok" class="w-4 h-4 text-green-500" />
            <ShieldAlert v-else class="w-4 h-4 text-destructive" />
            <span class="text-sm" :class="r.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'">{{ r.message }}</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 加载中 -->
    <div v-if="scanning" class="py-16 text-center">
      <Loader2 class="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
      <p class="text-sm text-muted-foreground">{{ t('uninstall.scanning') }}</p>
    </div>

    <!-- 扫描结果 -->
    <div v-else class="space-y-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="rounded-xl border bg-card/80 p-5 transition-all"
        :class="[
          item.exists
            ? 'border-border/50 hover:border-border'
            : 'border-border/20 opacity-50'
        ]"
      >
        <div class="flex items-start gap-4">
          <!-- 勾选框 -->
          <div class="pt-0.5">
            <input
              type="checkbox"
              :checked="selected.has(item.id)"
              :disabled="!item.exists || uninstalling"
              @change="toggleItem(item.id)"
              class="w-5 h-5 rounded border-border/50 bg-input text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>

          <!-- 图标 -->
          <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            :class="item.exists ? 'bg-destructive/10' : 'bg-muted/40'">
            <component
              :is="iconMap[item.id] || FolderX"
              class="w-5 h-5"
              :class="item.exists ? 'text-destructive' : 'text-muted-foreground'"
            />
          </div>

          <!-- 内容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-foreground">{{ item.label }}</h3>
              <span v-if="!item.exists" class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {{ t('uninstall.notFound') }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground mt-1 truncate" :title="item.path">{{ item.path }}</p>
            <p v-if="item.exists && item.size" class="text-xs text-muted-foreground/60 mt-0.5">{{ t('uninstall.size') }}: {{ item.size }}</p>

            <!-- 各项说明 -->
            <p class="text-xs mt-2 leading-relaxed"
              :class="item.id === 'npm-package' ? 'text-muted-foreground' : (selected.has(item.id) ? 'text-destructive/80' : 'text-muted-foreground')">
              <template v-if="item.id === 'npm-package'">{{ t('uninstall.npmDesc') }}</template>
              <template v-else-if="item.id === 'config-dir'">{{ t('uninstall.configDesc') }}</template>
              <template v-else-if="item.id === 'backups-dir'">{{ t('uninstall.backupsDesc') }}</template>
            </p>
          </div>
        </div>
      </div>

      <!-- 操作按钮区域 -->
      <div class="pt-4 flex items-center gap-4">
        <button
          @click="showConfirm = true"
          :disabled="!hasSelection || uninstalling"
          class="px-6 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <Loader2 v-if="uninstalling" class="w-4 h-4 animate-spin" />
          <Trash2 v-else class="w-4 h-4" />
          {{ uninstalling ? t('uninstall.uninstalling') : t('uninstall.executeBtn') }}
        </button>

        <p class="text-xs text-muted-foreground">
          {{ t('uninstall.selectedCount', { count: String(selected.size) }) }}
        </p>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <transition name="page">
      <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-2xl p-6">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <ShieldAlert class="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 class="text-base font-bold text-foreground">{{ t('uninstall.confirmTitle') }}</h3>
              <p class="text-sm text-muted-foreground mt-1">{{ t('uninstall.confirmDesc') }}</p>
            </div>
          </div>

          <!-- 将要删除的项目列表 -->
          <div class="my-4 p-3 rounded-lg bg-destructive/5 border border-destructive/10 space-y-1.5">
            <div v-for="item in items.filter(i => selected.has(i.id))" :key="item.id" class="flex items-center gap-2">
              <Trash2 class="w-3 h-3 text-destructive/60" />
              <span class="text-xs text-foreground">{{ item.label }}</span>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              @click="showConfirm = false"
              class="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              @click="executeUninstall"
              class="px-5 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
            >
              {{ t('uninstall.confirmBtn') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
