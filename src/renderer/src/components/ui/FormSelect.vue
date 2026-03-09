<script setup lang="ts">
defineProps<{
  modelValue: string
  options: { label: string; value: string }[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string]
}>()

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value)
}
</script>

<template>
  <select
    :value="modelValue"
    @change="onChange"
    class="w-full px-3.5 py-2.5 rounded-lg bg-input text-foreground text-sm border border-border/50 outline-none transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
    style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239ca3af%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>'); background-position: right 12px center; background-repeat: no-repeat;"
  >
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <option
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
    >{{ opt.label }}</option>
  </select>
</template>
