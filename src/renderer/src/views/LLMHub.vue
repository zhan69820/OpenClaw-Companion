<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useI18n } from '@/composables/useI18n'
import { PROVIDERS, type ProviderDef } from '@/lib/constants'
import ProviderIcon from '@/components/ui/ProviderIcon.vue'
import FormInput from '@/components/ui/FormInput.vue'
import TestButton from '@/components/common/TestButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { ChevronDown, ChevronUp, Download, Loader2, Info, CheckCircle2, Star, ExternalLink, Wand2 } from 'lucide-vue-next'

const config = useConfigStore()
const { t, locale } = useI18n()
const expandedId = ref<string | null>(null)
const fetchingModels = ref<string | null>(null)
const fetchError = ref<Record<string, string>>({})

// 按国内/国际分组显示
const domesticProviders = computed(() => PROVIDERS.filter(p => 
  p.region === 'domestic' || (p.region === 'both' && ['deepseek', 'siliconflow'].includes(p.id))
))
const internationalProviders = computed(() => PROVIDERS.filter(p => 
  p.region === 'global'
))
const otherProviders = computed(() => PROVIDERS.filter(p => 
  ['openrouter', 'ollama'].includes(p.id) || (p.region === 'both' && !['deepseek', 'siliconflow'].includes(p.id))
))

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function getProviderConfig(id: string): Record<string, any> {
  return config.providers[id] || {}
}

function isConfigured(id: string): boolean {
  const pc = getProviderConfig(id)
  return !!(pc.apiKey || (id === 'ollama' && pc.baseUrl))
}

function isPrimary(id: string): boolean {
  return config.primaryModel.startsWith(id + '/')
}

function getPrimaryModelName(id: string): string {
  const ref = config.primaryModel
  if (ref.startsWith(id + '/')) {
    return ref.substring(id.length + 1)
  }
  return ''
}

// 表单状态管理
const formState = ref<Record<string, {
  apiKey: string
  baseUrl: string
  model: string
  fallbacks: string
  fetchedModels: string[]
  setAsPrimary: boolean
}>>({})

function getForm(prov: ProviderDef) {
  if (!formState.value[prov.id]) {
    const pc = getProviderConfig(prov.id)
    const isPrimaryProvider = config.primaryModel.startsWith(prov.id + '/')
    let currentModel = ''
    if (isPrimaryProvider) {
      currentModel = config.primaryModel.substring(prov.id.length + 1)
    } else {
      const savedModels = config.agentDefaults?.models || {}
      const match = Object.keys(savedModels).find(k => k.startsWith(prov.id + '/'))
      if (match) currentModel = match.substring(prov.id.length + 1)
    }
    
    const fallbacks = config.agentDefaults?.model?.fallbacks || []
    const providerFallbacks = fallbacks.filter((f: string) => f.startsWith(prov.id + '/'))

    formState.value[prov.id] = {
      apiKey: pc.apiKey || '',
      baseUrl: pc.baseUrl || prov.url,
      model: currentModel || (prov.models[0] || ''),
      fallbacks: providerFallbacks.map((f: string) => f.substring(prov.id.length + 1)).join(', '),
      fetchedModels: [],
      setAsPrimary: isPrimaryProvider
    }
  }
  return formState.value[prov.id]
}

// 获取模型列表并自动填充第一个
async function handleFetchModels(prov: ProviderDef) {
  const form = getForm(prov)
  if (!form.apiKey && prov.id !== 'ollama') return
  
  fetchingModels.value = prov.id
  fetchError.value[prov.id] = ''
  
  try {
    const result = await window.api.llm.fetchModels({
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      apiType: prov.api
    })
    
    if (result.ok && result.models.length > 0) {
      form.fetchedModels = result.models
      // 自动填充第一个模型（如果当前为空或不在列表中）
      if (!form.model || !result.models.includes(form.model)) {
        form.model = result.models[0]
      }
    } else if (result.ok && result.models.length === 0) {
      fetchError.value[prov.id] = t('llm.fetchEmpty')
    } else {
      fetchError.value[prov.id] = result.message || t('llm.fetchFailed')
    }
  } catch (e: any) {
    fetchError.value[prov.id] = e?.message || t('llm.fetchError')
  } finally {
    fetchingModels.value = null
  }
}

// 智能填充推荐模型
function autoFillRecommended(prov: ProviderDef) {
  const form = getForm(prov)
  if (prov.models && prov.models.length > 0) {
    // 优先选择包含 turbo、lite、flash 等关键词的模型（通常更便宜/更快）
    const preferred = prov.models.find(m => 
      /turbo|lite|flash|mini|8k/i.test(m)
    ) || prov.models[0]
    form.model = preferred
  }
}

async function handleTest(prov: ProviderDef) {
  const form = getForm(prov)
  return window.api.llm.test({
    baseUrl: form.baseUrl,
    apiKey: form.apiKey,
    apiType: prov.api,
    model: form.model || prov.testModel
  })
}

function handleSaveProvider(prov: ProviderDef) {
  const form = getForm(prov)
  
  config.setProvider(prov.id, {
    baseUrl: form.baseUrl,
    apiKey: form.apiKey,
    api: prov.api
  })
  
  if (form.setAsPrimary && form.model) {
    const ref = `${prov.id}/${form.model}`
    config.setPrimaryModel(ref)
    config.data.agents.defaults.models[ref] = { alias: form.model }
  }
  
  const fbModels = form.fallbacks
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(m => `${prov.id}/${m}`)
  
  if (fbModels.length > 0) {
    const currentFallbacks = config.agentDefaults?.model?.fallbacks || []
    const otherProviderFallbacks = currentFallbacks.filter((f: string) => !f.startsWith(prov.id + '/'))
    config.setFallbacks([...otherProviderFallbacks, ...fbModels])
  }
  
  config.save()
}

// 打开API申请链接
function openApiDocs(prov: ProviderDef) {
  const urls: Record<string, string> = {
    openai: 'https://platform.openai.com/api-keys',
    'openai-cn': 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    google: 'https://aistudio.google.com/app/apikey',
    deepseek: 'https://platform.deepseek.com/api_keys',
    qwen: 'https://bailian.console.aliyun.com/?apiKey=1',
    moonshot: 'https://platform.moonshot.cn/console/api-keys',
    zhipu: 'https://bigmodel.cn/usercenter/apikeys',
    baidu: 'https://qianfan.cloud.baidu.com/',
    doubao: 'https://console.volcengine.com/ark/',
    spark: 'https://xinghuo.xfyun.cn/sparkapi',
    yi: 'https://platform.lingyiwanwu.com/',
    minimax: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    hunyuan: 'https://console.cloud.tencent.com/hunyuan/api-key',
    siliconflow: 'https://cloud.siliconflow.cn/account/ak',
    stepfun: 'https://platform.stepfun.com/',
    xai: 'https://console.x.ai/',
    mistral: 'https://console.mistral.ai/api-keys/',
    openrouter: 'https://openrouter.ai/keys'
  }
  
  const url = urls[prov.id]
  if (url) {
    window.open(url, '_blank')
  }
}

const showAdvanced = ref<Record<string, boolean>>({})
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-foreground tracking-tight">{{ t('llm.title') }}</h2>
      <p class="text-sm text-muted-foreground mt-1">{{ t('llm.subtitle') }}</p>
    </div>

    <!-- 当前主模型状态卡片 -->
    <div v-if="config.primaryModel" class="mb-6 p-4 rounded-xl border border-green-500/20 bg-green-500/5">
      <div class="flex items-center gap-3">
        <CheckCircle2 class="w-5 h-5 text-green-500" />
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">{{ t('llm.currentModel') }}:</span>
            <span class="font-semibold text-foreground">{{ config.primaryModel }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">{{ t('llm.inUse') }}</span>
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('llm.fallbacks') }}: {{ config.agentDefaults?.model?.fallbacks?.join(', ') || t('llm.none') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 国内大模型 -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-foreground/70 mb-3 flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-primary"></span>
        {{ t('llm.domestic') }}
      </h3>
      <div class="space-y-3">
        <div
          v-for="prov in domesticProviders"
          :key="prov.id"
          class="rounded-xl border border-border/50 bg-card/80 overflow-hidden transition-all duration-300"
          :class="[
            expandedId === prov.id ? 'shadow-lg shadow-primary/5 border-primary/20' : 'hover:border-border',
            isPrimary(prov.id) ? 'border-green-500/30 bg-green-500/5' : ''
          ]"
        >
          <!-- 卡片头部 -->
          <div
            @click="toggle(prov.id)"
            class="flex items-center gap-4 px-5 py-4 cursor-pointer group transition-colors hover:bg-accent/30"
          >
            <ProviderIcon :color="prov.color" :icon="prov.icon" />

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-foreground">{{ prov.name }}</h3>
                <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {{ prov.alias }}
                </span>
                <span v-if="isPrimary(prov.id)" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  <Star class="w-3 h-3" />
                  {{ t('llm.primary') }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ prov.desc }}
                <span v-if="isConfigured(prov.id) && getPrimaryModelName(prov.id)" class="text-green-500">
                  · {{ t('llm.current') }}: {{ getPrimaryModelName(prov.id) }}
                </span>
              </p>
            </div>

            <StatusBadge
              :status="isConfigured(prov.id) ? 'success' : 'idle'"
              :text="isConfigured(prov.id) ? t('llm.configured') : ''"
            />

            <div class="text-muted-foreground transition-transform" :class="expandedId === prov.id && 'rotate-180'">
              <ChevronDown class="w-5 h-5" />
            </div>
          </div>

          <!-- 展开的配置面板 -->
          <transition name="collapse">
            <div v-if="expandedId === prov.id" class="border-t border-border/30">
              <div class="px-6 py-5 space-y-5">
                <!-- 帮助提示 + API链接 -->
                <div class="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Info class="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div class="flex-1">
                    <pre class="text-xs text-primary/80 leading-relaxed whitespace-pre-wrap font-sans">{{ prov.help }}</pre>
                    <button
                      @click.stop="openApiDocs(prov)"
                      class="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      <ExternalLink class="w-3 h-3" />
                      {{ t('llm.getApiKey') }}
                    </button>
                  </div>
                </div>

                <!-- API Key -->
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">
                    API Key
                    <span v-if="prov.id !== 'ollama'" class="text-destructive">*</span>
                  </label>
                  <FormInput
                    v-model="getForm(prov).apiKey"
                    :secret="true"
                    :placeholder="prov.id === 'ollama' ? t('llm.ollamaNoKey') : t('llm.apiKeyPlaceholder')"
                  />
                </div>

                <!-- 默认模型输入 + 自动获取 -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-foreground">{{ t('llm.model') }}</label>
                    <div class="flex items-center gap-2">
                      <button
                        @click.stop="autoFillRecommended(prov)"
                        class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        :title="t('llm.autoFillRecommended')"
                      >
                        <Wand2 class="w-3 h-3" />
                        {{ t('llm.recommended') }}
                      </button>
                      <button
                        @click.stop="handleFetchModels(prov)"
                        :disabled="fetchingModels === prov.id || (!getForm(prov).apiKey && prov.id !== 'ollama')"
                        class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                      >
                        <Loader2 v-if="fetchingModels === prov.id" class="w-3 h-3 animate-spin" />
                        <Download v-else class="w-3 h-3" />
                        {{ fetchingModels === prov.id ? t('llm.fetching') : t('llm.autoFetch') }}
                      </button>
                    </div>
                  </div>
                  
                  <!-- 模型输入框 -->
                  <FormInput
                    v-model="getForm(prov).model"
                    :placeholder="t('llm.modelPlaceholder')"
                  />
                  
                  <!-- 获取到的模型提示 -->
                  <div v-if="getForm(prov).fetchedModels.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                    <span class="text-xs text-muted-foreground">{{ t('llm.availableModels') }}:</span>
                    <button
                      v-for="m in getForm(prov).fetchedModels.slice(0, 8)"
                      :key="m"
                      @click="getForm(prov).model = m"
                      class="text-xs px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      :class="getForm(prov).model === m ? 'bg-primary/20 text-primary' : 'text-muted-foreground'"
                    >
                      {{ m }}
                    </button>
                    <span v-if="getForm(prov).fetchedModels.length > 8" class="text-xs text-muted-foreground">
                      +{{ getForm(prov).fetchedModels.length - 8 }}
                    </span>
                  </div>
                  
                  <!-- 错误提示 -->
                  <p v-if="fetchError[prov.id]" class="text-xs text-destructive mt-1">
                    {{ fetchError[prov.id] }}
                  </p>
                  
                  <!-- 预设模型提示 -->
                  <div v-if="prov.models.length > 0 && getForm(prov).fetchedModels.length === 0" class="flex flex-wrap gap-1 mt-2">
                    <span class="text-xs text-muted-foreground">{{ t('llm.commonModels') }}:</span>
                    <button
                      v-for="m in prov.models.slice(0, 6)"
                      :key="m"
                      @click="getForm(prov).model = m"
                      class="text-xs px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                      :title="prov.modelMap?.[m] || m"
                    >
                      {{ m }}
                      <span v-if="prov.modelMap?.[m]" class="text-[10px] text-muted-foreground/50 ml-0.5">({{ prov.modelMap[m].split('(')[1]?.replace(')', '') || '' }})</span>
                    </button>
                  </div>
                </div>

                <!-- 模型说明提示 -->
                <div v-if="prov.modelMap && Object.keys(prov.modelMap).length > 0 && getForm(prov).model && prov.modelMap[getForm(prov).model]" 
                  class="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <p class="text-xs text-blue-500/80">
                    <span class="font-medium">{{ getForm(prov).model }}</span> = {{ prov.modelMap[getForm(prov).model] }}
                  </p>
                </div>

                <!-- 设为默认 -->
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="getForm(prov).setAsPrimary"
                    type="checkbox"
                    class="w-4 h-4 rounded border-border/50 bg-input text-primary focus:ring-primary/20"
                  />
                  <span class="text-sm text-foreground">{{ t('llm.setAsPrimary') }}</span>
                </label>

                <!-- 测试连接 -->
                <TestButton :on-test="() => handleTest(prov)" />

                <!-- 高级设置（折叠） -->
                <div>
                  <button
                    @click.stop="showAdvanced[prov.id] = !showAdvanced[prov.id]"
                    class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <component :is="showAdvanced[prov.id] ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
                    {{ t('llm.advanced') }}
                  </button>

                  <transition name="collapse">
                    <div v-if="showAdvanced[prov.id]" class="mt-3 space-y-4 pl-1">
                      <!-- Base URL -->
                      <div class="space-y-1.5">
                        <label class="text-sm font-medium text-foreground">Base URL</label>
                        <FormInput
                          v-model="getForm(prov).baseUrl"
                          :placeholder="prov.url"
                        />
                        <p class="text-[11px] text-muted-foreground">
                          API: <code class="px-1.5 py-0.5 rounded bg-muted text-xs">{{ prov.api }}</code>
                        </p>
                      </div>

                      <!-- 备选模型 -->
                      <div class="space-y-1.5">
                        <label class="text-sm font-medium text-foreground">{{ t('llm.fallbacksLabel') }}</label>
                        <FormInput
                          v-model="getForm(prov).fallbacks"
                          :placeholder="prov.models.slice(0, 3).join(', ') + '...'"
                        />
                        <p class="text-[11px] text-muted-foreground">
                          {{ t('llm.fallbacksHint', { prefix: prov.id + '/' }) }}
                        </p>
                      </div>
                    </div>
                  </transition>
                </div>

                <!-- 操作按钮 -->
                <div class="flex items-center justify-between pt-2 border-t border-border/30">
                  <button
                    @click="expandedId = null"
                    class="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {{ t('common.cancel') }}
                  </button>
                  <button
                    @click="handleSaveProvider(prov); expandedId = null"
                    class="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all"
                  >
                    {{ t('common.save') }}
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 国际大模型 -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-foreground/70 mb-3 flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-blue-500"></span>
        {{ t('llm.international') }}
      </h3>
      <div class="space-y-3">
        <div
          v-for="prov in internationalProviders"
          :key="prov.id"
          class="rounded-xl border border-border/50 bg-card/80 overflow-hidden transition-all duration-300"
          :class="[
            expandedId === prov.id ? 'shadow-lg shadow-primary/5 border-primary/20' : 'hover:border-border',
            isPrimary(prov.id) ? 'border-green-500/30 bg-green-500/5' : ''
          ]"
        >
          <div
            @click="toggle(prov.id)"
            class="flex items-center gap-4 px-5 py-4 cursor-pointer group transition-colors hover:bg-accent/30"
          >
            <ProviderIcon :color="prov.color" :icon="prov.icon" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-foreground">{{ prov.name }}</h3>
                <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{{ prov.alias }}</span>
                <span v-if="isPrimary(prov.id)" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  <Star class="w-3 h-3" />
                  {{ t('llm.primary') }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">{{ prov.desc }}</p>
            </div>
            <StatusBadge :status="isConfigured(prov.id) ? 'success' : 'idle'" :text="isConfigured(prov.id) ? t('llm.configured') : ''" />
            <div class="text-muted-foreground transition-transform" :class="expandedId === prov.id && 'rotate-180'">
              <ChevronDown class="w-5 h-5" />
            </div>
          </div>

          <transition name="collapse">
            <div v-if="expandedId === prov.id" class="border-t border-border/30">
              <div class="px-6 py-5 space-y-5">
                <div class="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Info class="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div class="flex-1">
                    <pre class="text-xs text-primary/80 leading-relaxed whitespace-pre-wrap font-sans">{{ prov.help }}</pre>
                    <button
                      @click.stop="openApiDocs(prov)"
                      class="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      <ExternalLink class="w-3 h-3" />
                      {{ t('llm.getApiKey') }}
                    </button>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">API Key <span class="text-destructive">*</span></label>
                  <FormInput v-model="getForm(prov).apiKey" :secret="true" :placeholder="t('llm.apiKeyPlaceholder')" />
                </div>

                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-foreground">{{ t('llm.model') }}</label>
                    <div class="flex items-center gap-2">
                      <button
                        @click.stop="autoFillRecommended(prov)"
                        class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Wand2 class="w-3 h-3" />
                        {{ t('llm.recommended') }}
                      </button>
                      <button
                        @click.stop="handleFetchModels(prov)"
                        :disabled="fetchingModels === prov.id || !getForm(prov).apiKey"
                        class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors"
                      >
                        <Loader2 v-if="fetchingModels === prov.id" class="w-3 h-3 animate-spin" />
                        <Download v-else class="w-3 h-3" />
                        {{ fetchingModels === prov.id ? t('llm.fetching') : t('llm.autoFetch') }}
                      </button>
                    </div>
                  </div>
                  
                  <FormInput v-model="getForm(prov).model" :placeholder="t('llm.modelPlaceholder')" />
                  
                  <div v-if="getForm(prov).fetchedModels.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                    <span class="text-xs text-muted-foreground">{{ t('llm.availableModels') }}:</span>
                    <button
                      v-for="m in getForm(prov).fetchedModels.slice(0, 8)"
                      :key="m"
                      @click="getForm(prov).model = m"
                      class="text-xs px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      :class="getForm(prov).model === m ? 'bg-primary/20 text-primary' : 'text-muted-foreground'"
                    >
                      {{ m }}
                    </button>
                  </div>
                  
                  <p v-if="fetchError[prov.id]" class="text-xs text-destructive mt-1">{{ fetchError[prov.id] }}</p>
                  
                  <div v-if="prov.models.length > 0 && getForm(prov).fetchedModels.length === 0" class="flex flex-wrap gap-1 mt-2">
                    <span class="text-xs text-muted-foreground">{{ t('llm.commonModels') }}:</span>
                    <button
                      v-for="m in prov.models.slice(0, 6)"
                      :key="m"
                      @click="getForm(prov).model = m"
                      class="text-xs px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                      :title="prov.modelMap?.[m] || m"
                    >
                      {{ m }}
                    </button>
                  </div>
                </div>

                <!-- 模型说明提示 (international) -->
                <div v-if="prov.modelMap && getForm(prov).model && prov.modelMap[getForm(prov).model]" 
                  class="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <p class="text-xs text-blue-500/80">
                    <span class="font-medium">{{ getForm(prov).model }}</span> = {{ prov.modelMap[getForm(prov).model] }}
                  </p>
                </div>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="getForm(prov).setAsPrimary" type="checkbox" class="w-4 h-4 rounded border-border/50 bg-input text-primary" />
                  <span class="text-sm text-foreground">{{ t('llm.setAsPrimary') }}</span>
                </label>

                <TestButton :on-test="() => handleTest(prov)" />

                <div>
                  <button @click.stop="showAdvanced[prov.id] = !showAdvanced[prov.id]" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <component :is="showAdvanced[prov.id] ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
                    {{ t('llm.advanced') }}
                  </button>
                  <transition name="collapse">
                    <div v-if="showAdvanced[prov.id]" class="mt-3 space-y-4 pl-1">
                      <div class="space-y-1.5">
                        <label class="text-sm font-medium text-foreground">Base URL</label>
                        <FormInput v-model="getForm(prov).baseUrl" :placeholder="prov.url" />
                        <p class="text-[11px] text-muted-foreground">API: <code class="px-1.5 py-0.5 rounded bg-muted text-xs">{{ prov.api }}</code></p>
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-sm font-medium text-foreground">{{ t('llm.fallbacksLabel') }}</label>
                        <FormInput v-model="getForm(prov).fallbacks" placeholder="gpt-4, gpt-3.5-turbo" />
                      </div>
                    </div>
                  </transition>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-border/30">
                  <button @click="expandedId = null" class="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">{{ t('common.cancel') }}</button>
                  <button @click="handleSaveProvider(prov); expandedId = null" class="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all">{{ t('common.save') }}</button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 其他/聚合 -->
    <div>
      <h3 class="text-sm font-semibold text-foreground/70 mb-3 flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-purple-500"></span>
        {{ t('llm.others') }}
      </h3>
      <div class="space-y-3">
        <div
          v-for="prov in otherProviders"
          :key="prov.id"
          class="rounded-xl border border-border/50 bg-card/80 overflow-hidden transition-all duration-300"
          :class="[
            expandedId === prov.id ? 'shadow-lg shadow-primary/5 border-primary/20' : 'hover:border-border',
            isPrimary(prov.id) ? 'border-green-500/30 bg-green-500/5' : ''
          ]"
        >
          <div
            @click="toggle(prov.id)"
            class="flex items-center gap-4 px-5 py-4 cursor-pointer group transition-colors hover:bg-accent/30"
          >
            <ProviderIcon :color="prov.color" :icon="prov.icon" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-foreground">{{ prov.name }}</h3>
                <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{{ prov.alias }}</span>
                <span v-if="isPrimary(prov.id)" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  <Star class="w-3 h-3" />
                  {{ t('llm.primary') }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">{{ prov.desc }}</p>
            </div>
            <StatusBadge :status="isConfigured(prov.id) ? 'success' : 'idle'" :text="isConfigured(prov.id) ? t('llm.configured') : ''" />
            <div class="text-muted-foreground transition-transform" :class="expandedId === prov.id && 'rotate-180'">
              <ChevronDown class="w-5 h-5" />
            </div>
          </div>

          <transition name="collapse">
            <div v-if="expandedId === prov.id" class="border-t border-border/30">
              <div class="px-6 py-5 space-y-5">
                <div class="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Info class="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div class="flex-1">
                    <pre class="text-xs text-primary/80 leading-relaxed whitespace-pre-wrap font-sans">{{ prov.help }}</pre>
                    <button
                      v-if="prov.id !== 'ollama'"
                      @click.stop="openApiDocs(prov)"
                      class="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      <ExternalLink class="w-3 h-3" />
                      {{ t('llm.getApiKey') }}
                    </button>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">API Key {{ prov.id === 'ollama' ? t('llm.optional') : '' }}</label>
                  <FormInput v-model="getForm(prov).apiKey" :secret="true" :placeholder="prov.id === 'ollama' ? t('llm.ollamaNoKey') : t('llm.apiKeyPlaceholder')" />
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">{{ t('llm.model') }}</label>
                  <FormInput v-model="getForm(prov).model" :placeholder="t('llm.modelPlaceholder')" />
                  <div v-if="prov.models.length > 0" class="flex flex-wrap gap-1 mt-2">
                    <span class="text-xs text-muted-foreground">{{ t('llm.commonModels') }}:</span>
                    <button
                      v-for="m in prov.models"
                      :key="m"
                      @click="getForm(prov).model = m"
                      class="text-xs px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    >
                      {{ m }}
                    </button>
                  </div>
                </div>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="getForm(prov).setAsPrimary" type="checkbox" class="w-4 h-4 rounded border-border/50 bg-input text-primary" />
                  <span class="text-sm text-foreground">{{ t('llm.setAsPrimary') }}</span>
                </label>

                <TestButton :on-test="() => handleTest(prov)" />

                <div class="flex items-center justify-between pt-2 border-t border-border/30">
                  <button @click="expandedId = null" class="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">{{ t('common.cancel') }}</button>
                  <button @click="handleSaveProvider(prov); expandedId = null" class="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all">{{ t('common.save') }}</button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>
