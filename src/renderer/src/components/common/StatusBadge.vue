<script setup lang="ts">
defineProps<{
  status: 'success' | 'warning' | 'error' | 'idle' | 'loading'
  text?: string
  pulse?: boolean
}>()
</script>

<template>
  <div class="inline-flex items-center gap-1.5">
    <span
      class="w-2 h-2 rounded-full shrink-0"
      :class="{
        'bg-green-500': status === 'success',
        'bg-yellow-500': status === 'warning',
        'bg-red-500': status === 'error',
        'bg-muted-foreground/30': status === 'idle',
        'bg-primary animate-pulse': status === 'loading',
        'animate-pulse-dot': pulse && status !== 'loading'
      }"
    />
    <span
      v-if="text"
      class="text-xs"
      :class="{
        'text-green-500': status === 'success',
        'text-yellow-500': status === 'warning',
        'text-red-500': status === 'error',
        'text-muted-foreground': status === 'idle',
        'text-primary': status === 'loading'
      }"
    >{{ text }}</span>
  </div>
</template>
