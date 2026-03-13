<script setup lang="ts">
import { onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import AppLayout from '@/components/layout/AppLayout.vue'

const config = useConfigStore()

onMounted(async () => {
  await config.detectAndLoad()
})
</script>

<template>
  <AppLayout />
</template>
