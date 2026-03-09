<script setup lang="ts">
import { ref } from 'vue'
import { Zap, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  onTest: () => Promise<{ ok: boolean; message: string; latency?: number }>
}>()

const testing = ref(false)
const result = ref<{ ok: boolean; message: string; latency?: number } | null>(null)

async function handleTest() {
  testing.value = true
  result.value = null
  try {
    result.value = await props.onTest()
  } catch (e) {
    result.value = { ok: false, message: String(e) }
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <button
      @click="handleTest"
      :disabled="testing"
      class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-60"
      :class="testing
        ? 'bg-muted text-muted-foreground'
        : 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.97]'"
    >
      <Loader2 v-if="testing" class="w-4 h-4 animate-spin" />
      <Zap v-else class="w-4 h-4" />
      {{ testing ? '测试中...' : '测试连接' }}
    </button>
    <transition name="page">
      <div v-if="result" class="flex items-center gap-1.5 text-sm">
        <div
          class="w-2 h-2 rounded-full"
          :class="result.ok ? 'bg-green-500' : 'bg-red-500'"
        />
        <span :class="result.ok ? 'text-green-500' : 'text-red-400'">
          {{ result.message }}
        </span>
      </div>
    </transition>
  </div>
</template>
