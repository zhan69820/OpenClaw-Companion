<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import { CHANNELS, type ChannelDef } from '@/lib/constants'
import ProviderIcon from '@/components/ui/ProviderIcon.vue'
import FormInput from '@/components/ui/FormInput.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Info, Save } from 'lucide-vue-next'

const config = useConfigStore()

const enabledChannels = ref<Record<string, boolean>>({})
const formState = ref<Record<string, Record<string, string>>>({})
const allowFromState = ref<Record<string, string>>({})

// 初始化表单状态
function initChannelForm(ch: ChannelDef) {
  const cc = config.channels[ch.id] || {}
  if (!enabledChannels.value.hasOwnProperty(ch.id)) {
    enabledChannels.value[ch.id] = cc.enabled === true || ch.fields.some(f => !!cc[f.key])
  }
  if (!formState.value[ch.id]) {
    const form: Record<string, string> = {}
    for (const f of ch.fields) {
      form[f.key] = cc[f.key] || ''
    }
    formState.value[ch.id] = form
  }
  if (!allowFromState.value.hasOwnProperty(ch.id)) {
    const af = cc.allowFrom
    allowFromState.value[ch.id] = Array.isArray(af) ? af.join(', ') : ''
  }
}

CHANNELS.forEach(initChannelForm)

function toggleChannel(id: string) {
  enabledChannels.value[id] = !enabledChannels.value[id]
}

function validate(value: string, field: { pattern?: string }): boolean {
  if (!field.pattern || !value) return true
  return new RegExp(field.pattern).test(value)
}

function saveChannel(ch: ChannelDef) {
  const form = formState.value[ch.id] || {}
  const obj: Record<string, unknown> = { ...ch.extraConfig, enabled: enabledChannels.value[ch.id] }
  for (const f of ch.fields) {
    obj[f.key] = form[f.key] || ''
  }
  const afStr = allowFromState.value[ch.id]?.trim()
  obj.allowFrom = afStr ? afStr.split(',').map(s => s.trim()).filter(Boolean) : []
  config.setChannel(ch.id, obj)
}

function isChannelConfigured(id: string): boolean {
  const cc = config.channels[id]
  return cc && (cc.enabled === true || Object.keys(cc).length > 0)
}
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-foreground tracking-tight">通信频道集市</h2>
      <p class="text-sm text-muted-foreground mt-1">
        开启频道开关后填写对应的配置信息。每个频道都有详细的配置指引。
      </p>
    </div>

    <div class="space-y-4">
      <div
        v-for="ch in CHANNELS"
        :key="ch.id"
        class="rounded-xl border border-border/50 bg-card/80 overflow-hidden transition-all duration-300"
        :class="enabledChannels[ch.id] ? 'shadow-lg shadow-primary/5 border-primary/20' : ''"
      >
        <!-- 卡片头部 + 开关 -->
        <div class="flex items-center gap-4 px-5 py-4">
          <ProviderIcon :color="ch.color" :icon="ch.icon" />

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-foreground">{{ ch.name }}</h3>
              <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {{ ch.alias }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">{{ ch.desc }}</p>
          </div>

          <StatusBadge
            v-if="isChannelConfigured(ch.id)"
            status="success"
            text="已配置"
          />

          <!-- 开关 -->
          <button
            @click="toggleChannel(ch.id)"
            class="relative w-12 h-7 rounded-full transition-all duration-300 shrink-0"
            :class="enabledChannels[ch.id] ? 'bg-primary' : 'bg-muted-foreground/20'"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
              :class="enabledChannels[ch.id] ? 'left-6' : 'left-1'"
            />
          </button>
        </div>

        <!-- 展开的配置面板 -->
        <transition name="collapse">
          <div v-if="enabledChannels[ch.id]" class="border-t border-border/30">
            <div class="px-6 py-5 space-y-5">
              <!-- 操作指引 -->
              <div class="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Info class="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <pre class="text-xs text-primary/80 leading-relaxed whitespace-pre-wrap font-sans">{{ ch.help }}</pre>
              </div>

              <!-- 配置字段 -->
              <template v-if="ch.fields.length > 0">
                <div v-for="field in ch.fields" :key="field.key" class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">
                    {{ field.label }}
                    <span class="text-destructive">*</span>
                  </label>
                  <FormInput
                    v-model="formState[ch.id][field.key]"
                    :secret="field.secret"
                    :placeholder="field.placeholder"
                  />
                </div>
              </template>
              <div v-else class="p-3 rounded-lg bg-muted/40">
                <p class="text-sm text-muted-foreground">
                  此频道无需手动填写 Token，请按上方步骤通过命令行完成配置。
                </p>
              </div>

              <!-- 允许的用户 -->
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">允许的用户 ID（可选，逗号分隔）</label>
                <FormInput
                  v-model="allowFromState[ch.id]"
                  placeholder="留空允许所有用户"
                />
              </div>

              <!-- 保存按钮 -->
              <div class="flex justify-end pt-2 border-t border-border/30">
                <button
                  @click="saveChannel(ch)"
                  class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all"
                >
                  <Save class="w-4 h-4" />
                  保存频道配置
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>
