<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string
  type?: string
  placeholder?: string
  secret?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string]
}>()

const showSecret = ref(false)

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="relative">
    <input
      :value="modelValue"
      @input="onInput"
      :type="secret && !showSecret ? 'password' : (type || 'text')"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full px-3.5 py-2.5 rounded-lg bg-input text-foreground text-sm placeholder:text-muted-foreground/50 border border-border/50 outline-none transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <button
      v-if="secret && modelValue"
      @click="showSecret = !showSecret"
      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {{ showSecret ? '隐藏' : '显示' }}
    </button>
  </div>
</template>
