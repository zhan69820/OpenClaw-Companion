<script setup lang="ts">
defineProps<{
  color: string
  icon: string
  size?: number
}>()
</script>

<template>
  <div
    class="rounded-xl flex items-center justify-center shrink-0 font-bold text-white shadow-lg"
    :style="{
      backgroundColor: color,
      width: (size || 44) + 'px',
      height: (size || 44) + 'px',
      fontSize: (icon.length > 2 ? (size || 44) * 0.28 : (size || 44) * 0.36) + 'px',
      boxShadow: `0 4px 14px ${color}40`
    }"
  >
    {{ icon }}
  </div>
</template>
