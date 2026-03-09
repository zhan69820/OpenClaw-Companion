import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const data = ref<Record<string, any>>({})
  const configPath = ref<string | null>(null)
  const configFormat = ref<string>('')
  const loaded = ref(false)
  const loading = ref(false)
  const message = ref('')
  const isDirty = ref(false)

  const providers = computed(() => data.value?.models?.providers || {})
  const channels = computed(() => data.value?.channels || {})
  const agentDefaults = computed(() => data.value?.agents?.defaults || {})

  const primaryModel = computed(() => {
    return agentDefaults.value?.model?.primary || ''
  })

  function ensureStructure() {
    if (!data.value.models) data.value.models = {}
    if (!data.value.models.providers) data.value.models.providers = {}
    if (!data.value.agents) data.value.agents = {}
    if (!data.value.agents.defaults) data.value.agents.defaults = {}
    if (!data.value.agents.defaults.model) data.value.agents.defaults.model = { primary: '', fallbacks: [] }
    if (!data.value.agents.defaults.models) data.value.agents.defaults.models = {}
    if (!data.value.channels) data.value.channels = {}
  }

  async function detectAndLoad() {
    loading.value = true
    try {
      const detected = await window.api.config.detect()
      if (detected.ok && detected.path) {
        const result = await window.api.config.load(detected.path)
        if (result.ok) {
          data.value = result.data || {}
          configPath.value = result.path
          configFormat.value = result.format
          loaded.value = true
          message.value = result.message
          ensureStructure()
        } else {
          message.value = result.message
        }
      } else {
        message.value = '未检测到配置文件，请手动选择或新建'
      }
    } finally {
      loading.value = false
    }
  }

  async function loadFromFile(filePath?: string) {
    loading.value = true
    try {
      const result = filePath
        ? await window.api.config.load(filePath)
        : await window.api.config.selectFile()
      if (result.ok) {
        data.value = result.data || {}
        configPath.value = result.path
        configFormat.value = result.format
        loaded.value = true
        isDirty.value = false
        message.value = result.message
        ensureStructure()
      }
      return result
    } finally {
      loading.value = false
    }
  }

  async function save() {
    ensureStructure()
    const result = await window.api.config.save(JSON.parse(JSON.stringify(data.value)))
    if (result.ok) {
      isDirty.value = false
      message.value = result.message
    }
    return result
  }

  function setProvider(id: string, cfg: Record<string, unknown>) {
    ensureStructure()
    data.value.models.providers[id] = cfg
    isDirty.value = true
  }

  function setPrimaryModel(ref: string) {
    ensureStructure()
    data.value.agents.defaults.model.primary = ref
    isDirty.value = true
  }

  function setFallbacks(models: string[]) {
    ensureStructure()
    data.value.agents.defaults.model.fallbacks = models
    isDirty.value = true
  }

  function setChannel(id: string, cfg: Record<string, unknown>) {
    ensureStructure()
    data.value.channels[id] = cfg
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  return {
    data, configPath, configFormat, loaded, loading, message, isDirty,
    providers, channels, agentDefaults, primaryModel,
    detectAndLoad, loadFromFile, save,
    setProvider, setPrimaryModel, setFallbacks, setChannel, ensureStructure, markClean
  }
})
