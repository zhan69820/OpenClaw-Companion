export interface ProviderDef {
  id: string
  name: string
  alias: string
  color: string
  icon: string
  url: string
  api: 'openai-completions' | 'anthropic-messages'
  models: string[]
  /** 模型名称 → 实际版本映射（用于提示用户） */
  modelMap?: Record<string, string>
  testModel: string
  desc: string
  help: string
  /** 地区标识: domestic=国内, global=国际, both=同时可用 */
  region?: 'domestic' | 'global' | 'both'
}

export interface ChannelDef {
  id: string
  name: string
  alias: string
  color: string
  icon: string
  desc: string
  help: string
  fields: ChannelField[]
  extraConfig: Record<string, unknown>
}

export interface ChannelField {
  key: string
  label: string
  secret: boolean
  placeholder: string
  pattern?: string
  patternMessage?: string
}

// ═══════════════════════════════════════════════════════════════
// 大模型提供商 - 按国内/国际分组
// ═══════════════════════════════════════════════════════════════

export const PROVIDERS: ProviderDef[] = [
  // ─────────────── 国内大模型 ───────────────
  {
    id: 'qwen', name: '通义千问', alias: '阿里云百炼',
    color: '#ff6a00', icon: '千',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', api: 'openai-completions',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long', 'qwen-coder-plus', 'qwen-math-plus', 'qwen-vl-max', 'qwen2.5-72b-instruct'],
    modelMap: {
      'qwen-max': 'Qwen-Max (最强)',
      'qwen-plus': 'Qwen-Plus (均衡)',
      'qwen-turbo': 'Qwen-Turbo (快速/低价)',
      'qwen-long': 'Qwen-Long (长文本)',
      'qwen-coder-plus': 'Qwen-Coder (编程)',
      'qwen-math-plus': 'Qwen-Math (数学)',
      'qwen-vl-max': 'Qwen-VL (视觉)',
      'qwen2.5-72b-instruct': 'Qwen2.5-72B'
    },
    testModel: 'qwen-turbo',
    desc: '阿里云百炼平台，通义千问系列，兼容 OpenAI 协议',
    help: '在 bailian.console.aliyun.com 创建 API Key，选择"模型服务"获取 Key',
    region: 'domestic'
  },
  {
    id: 'deepseek', name: 'DeepSeek', alias: '深度求索',
    color: '#4d6bfe', icon: 'D',
    url: 'https://api.deepseek.com', api: 'openai-completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    modelMap: {
      'deepseek-chat': 'DeepSeek-V3.2 (通用对话)',
      'deepseek-reasoner': 'DeepSeek-R1 (深度推理)'
    },
    testModel: 'deepseek-chat',
    desc: 'deepseek-chat = V3.2，deepseek-reasoner = R1，全球统一接口',
    help: '在 platform.deepseek.com/api_keys 创建 API Key\n\n注意: deepseek-chat 已升级至 V3.2，无需单独选 V3.2',
    region: 'both'
  },
  {
    id: 'moonshot', name: 'Moonshot', alias: 'Kimi / 月之暗面',
    color: '#5b5fc7', icon: 'K',
    url: 'https://api.moonshot.cn/v1', api: 'openai-completions',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k', 'moonshot-v1-auto', 'kimi-latest'],
    modelMap: {
      'moonshot-v1-128k': '128K 长上下文',
      'moonshot-v1-32k': '32K 上下文',
      'moonshot-v1-8k': '8K (快速/低价)',
      'moonshot-v1-auto': '自动选择上下文',
      'kimi-latest': 'Kimi 最新版'
    },
    testModel: 'moonshot-v1-8k',
    desc: '月之暗面 Kimi，擅长长文本处理（200万字上下文）',
    help: '在 platform.moonshot.cn/console/api-keys 创建',
    region: 'domestic'
  },
  {
    id: 'zhipu', name: '智谱AI', alias: 'GLM / 智谱清言',
    color: '#3b7ded', icon: '智',
    url: 'https://open.bigmodel.cn/api/paas/v4', api: 'openai-completions',
    models: ['glm-4-plus', 'glm-4', 'glm-4-flash', 'glm-4-long', 'glm-4v-plus', 'glm-4-alltools'],
    modelMap: {
      'glm-4-plus': 'GLM-4 Plus (最强)',
      'glm-4': 'GLM-4 (标准)',
      'glm-4-flash': 'GLM-4 Flash (免费/快速)',
      'glm-4-long': 'GLM-4 Long (长文本)',
      'glm-4v-plus': 'GLM-4V Plus (视觉)',
      'glm-4-alltools': 'GLM-4 AllTools (全能)'
    },
    testModel: 'glm-4-flash',
    desc: '智谱 GLM-4 系列，清华系大模型，兼容 OpenAI 协议',
    help: '在 bigmodel.cn/usercenter/apikeys 创建',
    region: 'domestic'
  },
  {
    id: 'baidu', name: '文心一言', alias: '百度千帆',
    color: '#2932e1', icon: '文',
    url: 'https://qianfan.baidubce.com/v2', api: 'openai-completions',
    models: ['ernie-4.0-turbo-8k', 'ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-128k', 'ernie-lite-8k'],
    modelMap: {
      'ernie-4.0-turbo-8k': 'ERNIE 4.0 Turbo (最强)',
      'ernie-4.0-8k': 'ERNIE 4.0 (标准)',
      'ernie-3.5-8k': 'ERNIE 3.5 (均衡)',
      'ernie-speed-128k': 'ERNIE Speed (长文/快速)',
      'ernie-lite-8k': 'ERNIE Lite (免费)'
    },
    testModel: 'ernie-lite-8k',
    desc: '百度文心一言，千帆大模型平台',
    help: '在 qianfan.cloud.baidu.com 创建应用，获取 API Key 和 Secret Key',
    region: 'domestic'
  },
  {
    id: 'doubao', name: '豆包', alias: '字节跳动 / 火山引擎',
    color: '#ff0050', icon: '豆',
    url: 'https://ark.cn-beijing.volces.com/api/v3', api: 'openai-completions',
    models: ['doubao-1.5-pro-32k', 'doubao-1.5-pro-256k', 'doubao-1.5-lite-32k', 'doubao-1.5-vision-pro-32k', 'doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite-32k'],
    modelMap: {
      'doubao-1.5-pro-32k': 'Doubao 1.5 Pro 32K (最新)',
      'doubao-1.5-pro-256k': 'Doubao 1.5 Pro 256K (长文本)',
      'doubao-1.5-lite-32k': 'Doubao 1.5 Lite (快速)',
      'doubao-1.5-vision-pro-32k': 'Doubao 1.5 Vision (视觉)',
      'doubao-pro-32k': 'Doubao Pro 32K',
      'doubao-pro-128k': 'Doubao Pro 128K',
      'doubao-lite-32k': 'Doubao Lite (低价)'
    },
    testModel: 'doubao-1.5-lite-32k',
    desc: '字节跳动豆包大模型，火山引擎方舟平台\n注意: 豆包使用推理接入点 ID 作为模型名称',
    help: '在 console.volcengine.com/ark 开通服务\n1. 创建推理接入点获取 Endpoint ID\n2. 用 Endpoint ID 作为模型名称填入',
    region: 'domestic'
  },
  {
    id: 'spark', name: '讯飞星火', alias: '科大讯飞',
    color: '#e60012', icon: '星',
    url: 'https://spark-api-open.xf-yun.com/v1', api: 'openai-completions',
    models: ['4.0Ultra', 'generalv4', 'generalv3.5', 'generalv3', 'pro-128k', 'max-32k', 'lite'],
    modelMap: {
      '4.0Ultra': 'Spark 4.0 Ultra (旗舰)',
      'generalv4': 'Spark 4.0 (标准)',
      'generalv3.5': 'Spark 3.5 (均衡)',
      'generalv3': 'Spark 3.0',
      'pro-128k': 'Spark Pro 128K (长文本)',
      'max-32k': 'Spark Max 32K',
      'lite': 'Spark Lite (免费)'
    },
    testModel: 'lite',
    desc: '科大讯飞星火认知大模型',
    help: '在 xinghuo.xfyun.cn 创建应用，在 spark-api.xf-yun.com 获取 API Key',
    region: 'domestic'
  },
  {
    id: 'yi', name: '零一万物', alias: '01.AI',
    color: '#0066ff', icon: '零',
    url: 'https://api.lingyiwanwu.com/v1', api: 'openai-completions',
    models: ['yi-large', 'yi-medium', 'yi-spark', 'yi-vision', 'yi-large-rag'],
    modelMap: {
      'yi-large': 'Yi-Large (最强)',
      'yi-medium': 'Yi-Medium (均衡)',
      'yi-spark': 'Yi-Spark (快速/低价)',
      'yi-vision': 'Yi-Vision (视觉)',
      'yi-large-rag': 'Yi-Large-RAG (检索增强)'
    },
    testModel: 'yi-spark',
    desc: '李开复旗下零一万物 Yi 系列大模型',
    help: '在 platform.lingyiwanwu.com 注册并创建 API Key',
    region: 'domestic'
  },
  {
    id: 'minimax', name: 'MiniMax', alias: '海螺 AI',
    color: '#ff6b35', icon: '海',
    url: 'https://api.minimax.chat/v1', api: 'openai-completions',
    models: ['MiniMax-Text-01', 'abab6.5s-chat', 'abab6.5-chat', 'abab6-chat', 'abab5.5-chat'],
    modelMap: {
      'MiniMax-Text-01': 'MiniMax-Text-01 (最新旗舰)',
      'abab6.5s-chat': 'ABAB 6.5s (快速)',
      'abab6.5-chat': 'ABAB 6.5 (标准)',
      'abab6-chat': 'ABAB 6',
      'abab5.5-chat': 'ABAB 5.5'
    },
    testModel: 'abab6.5s-chat',
    desc: 'MiniMax 海螺 AI，国内领先的 AI 公司',
    help: '在 platform.minimaxi.com 创建 API Key',
    region: 'domestic'
  },
  {
    id: 'hunyuan', name: '腾讯混元', alias: '腾讯云',
    color: '#0052d9', icon: '混',
    url: 'https://api.hunyuan.cloud.tencent.com/v1', api: 'openai-completions',
    models: ['hunyuan-turbo', 'hunyuan-pro', 'hunyuan-standard', 'hunyuan-lite', 'hunyuan-vision'],
    modelMap: {
      'hunyuan-turbo': 'HunYuan Turbo (旗舰)',
      'hunyuan-pro': 'HunYuan Pro (高级)',
      'hunyuan-standard': 'HunYuan Standard (标准)',
      'hunyuan-lite': 'HunYuan Lite (免费)',
      'hunyuan-vision': 'HunYuan Vision (视觉)'
    },
    testModel: 'hunyuan-lite',
    desc: '腾讯混元大模型，腾讯云 TI 平台',
    help: '在 console.cloud.tencent.com/hunyuan 开通服务获取 API Key',
    region: 'domestic'
  },
  {
    id: 'siliconflow', name: '硅基流动', alias: 'SiliconCloud',
    color: '#00d4aa', icon: '硅',
    url: 'https://api.siliconflow.cn/v1', api: 'openai-completions',
    models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct', 'Pro/deepseek-ai/DeepSeek-V3', 'meta-llama/Llama-3.3-70B-Instruct'],
    modelMap: {
      'deepseek-ai/DeepSeek-V3': 'DeepSeek-V3 (免费)',
      'deepseek-ai/DeepSeek-R1': 'DeepSeek-R1 (推理)',
      'Qwen/Qwen2.5-72B-Instruct': 'Qwen2.5-72B (免费)',
      'Pro/deepseek-ai/DeepSeek-V3': 'DeepSeek-V3 Pro (付费高速)',
      'meta-llama/Llama-3.3-70B-Instruct': 'Llama-3.3-70B'
    },
    testModel: 'deepseek-ai/DeepSeek-V3',
    desc: '硅基流动 SiliconCloud，高性价比模型 API 平台，新用户送额度',
    help: '在 cloud.siliconflow.cn 注册获取 API Key\n支持几十种开源模型，部分免费使用',
    region: 'both'
  },
  {
    id: 'stepfun', name: '阶跃星辰', alias: 'StepFun',
    color: '#6366f1', icon: '跃',
    url: 'https://api.stepfun.com/v1', api: 'openai-completions',
    models: ['step-2-16k', 'step-1-256k', 'step-1-128k', 'step-1-32k', 'step-1-8k', 'step-1v-32k'],
    modelMap: {
      'step-2-16k': 'Step-2 (旗舰)',
      'step-1-256k': 'Step-1 256K (超长文本)',
      'step-1-128k': 'Step-1 128K',
      'step-1-32k': 'Step-1 32K',
      'step-1-8k': 'Step-1 8K (低价)',
      'step-1v-32k': 'Step-1V (视觉)'
    },
    testModel: 'step-1-8k',
    desc: '阶跃星辰 Step 系列大模型',
    help: '在 platform.stepfun.com 创建 API Key',
    region: 'domestic'
  },
  // ─────────────── 国际大模型 ───────────────
  {
    id: 'openai', name: 'OpenAI', alias: 'ChatGPT / GPT-4o',
    color: '#10a37f', icon: 'O',
    url: 'https://api.openai.com/v1', api: 'openai-completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3-mini', 'o4-mini', 'gpt-4-turbo'],
    modelMap: {
      'gpt-4o': 'GPT-4o (旗舰多模态)',
      'gpt-4o-mini': 'GPT-4o Mini (快速/低价)',
      'gpt-4.1': 'GPT-4.1 (最新旗舰)',
      'gpt-4.1-mini': 'GPT-4.1 Mini',
      'gpt-4.1-nano': 'GPT-4.1 Nano (最低价)',
      'o3-mini': 'o3-mini (推理)',
      'o4-mini': 'o4-mini (最新推理)',
      'gpt-4-turbo': 'GPT-4 Turbo'
    },
    testModel: 'gpt-4o-mini',
    desc: 'OpenAI 官方 (国际版)\n国内用户需代理访问或使用中转服务',
    help: '在 platform.openai.com/api-keys 创建 API Key\n\n国内使用提示:\n- 可改 Base URL 为中转服务地址\n- 或用硅基流动/OpenRouter 等聚合平台',
    region: 'global'
  },
  {
    id: 'openai-cn', name: 'OpenAI 中转', alias: '国内中转 / 代理',
    color: '#10a37f', icon: 'O+',
    url: 'https://api.openai-proxy.com/v1', api: 'openai-completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini', 'o4-mini'],
    testModel: 'gpt-4o-mini',
    desc: 'OpenAI 国内中转服务，无需翻墙\n请自行替换为你使用的中转 Base URL',
    help: '1. 使用中转服务商提供的 Base URL 替换默认地址\n2. 填入中转服务商提供的 API Key\n3. 常见中转: api2d.com, openai-sb.com 等',
    region: 'domestic'
  },
  {
    id: 'anthropic', name: 'Anthropic', alias: 'Claude',
    color: '#d4a27f', icon: 'A',
    url: 'https://api.anthropic.com', api: 'anthropic-messages',
    models: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    modelMap: {
      'claude-sonnet-4-20250514': 'Claude Sonnet 4 (最新旗舰)',
      'claude-3-7-sonnet-latest': 'Claude 3.7 Sonnet',
      'claude-3-5-haiku-latest': 'Claude 3.5 Haiku (快速/低价)',
      'claude-3-opus-latest': 'Claude 3 Opus'
    },
    testModel: 'claude-3-5-haiku-latest',
    desc: 'Claude 系列 (国际版)，注意 Base URL 不带 /v1\n国内用户需代理访问',
    help: '在 console.anthropic.com/settings/keys 创建\n\n国内使用: 可通过 OpenRouter 或中转服务使用 Claude',
    region: 'global'
  },
  {
    id: 'google', name: 'Google', alias: 'Gemini',
    color: '#4285f4', icon: 'G',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai', api: 'openai-completions',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    modelMap: {
      'gemini-2.5-pro': 'Gemini 2.5 Pro (最强推理)',
      'gemini-2.5-flash': 'Gemini 2.5 Flash (快速)',
      'gemini-2.0-flash': 'Gemini 2.0 Flash (低价)',
      'gemini-1.5-pro': 'Gemini 1.5 Pro (长文本)'
    },
    testModel: 'gemini-2.0-flash',
    desc: 'Gemini 系列，通过 OpenAI 兼容接口接入\n国内用户需代理访问',
    help: '在 aistudio.google.com/apikey 创建',
    region: 'global'
  },
  {
    id: 'xai', name: 'xAI', alias: 'Grok',
    color: '#1d1d1f', icon: 'X',
    url: 'https://api.x.ai/v1', api: 'openai-completions',
    models: ['grok-3', 'grok-3-mini', 'grok-2'],
    modelMap: {
      'grok-3': 'Grok-3 (旗舰)',
      'grok-3-mini': 'Grok-3 Mini (快速)',
      'grok-2': 'Grok-2'
    },
    testModel: 'grok-3-mini',
    desc: '马斯克旗下 Grok，兼容 OpenAI 协议',
    help: '在 console.x.ai 创建 API Key',
    region: 'global'
  },
  {
    id: 'mistral', name: 'Mistral AI', alias: 'Mistral',
    color: '#ff7000', icon: 'M',
    url: 'https://api.mistral.ai/v1', api: 'openai-completions',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-nemo'],
    modelMap: {
      'mistral-large-latest': 'Mistral Large (旗舰)',
      'mistral-medium-latest': 'Mistral Medium',
      'mistral-small-latest': 'Mistral Small (快速)',
      'open-mistral-nemo': 'Mistral Nemo (开源)'
    },
    testModel: 'mistral-small-latest',
    desc: '欧洲领先的开源模型',
    help: '在 console.mistral.ai/api-keys 创建',
    region: 'global'
  },
  // ─────────────── 聚合/本地 ───────────────
  {
    id: 'openrouter', name: 'OpenRouter', alias: '聚合中转',
    color: '#6e41e2', icon: 'OR',
    url: 'https://openrouter.ai/api/v1', api: 'openai-completions',
    models: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-2.5-flash', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'],
    modelMap: {
      'anthropic/claude-sonnet-4': 'Claude Sonnet 4',
      'openai/gpt-4o': 'GPT-4o',
      'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
      'deepseek/deepseek-chat': 'DeepSeek V3',
      'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B'
    },
    testModel: 'deepseek/deepseek-chat',
    desc: '聚合多家模型的中转平台，一个 Key 用所有模型\n国内可直连，适合访问国际模型',
    help: '在 openrouter.ai/keys 创建',
    region: 'both'
  },
  {
    id: 'ollama', name: 'Ollama', alias: '本地部署',
    color: '#7c8db0', icon: 'OL',
    url: 'http://localhost:11434/v1', api: 'openai-completions',
    models: ['llama3.2', 'qwen2.5', 'gemma2', 'phi4', 'mistral', 'deepseek-r1'],
    testModel: 'llama3.2',
    desc: '本地运行开源模型，无需 API Key，完全离线',
    help: '安装 Ollama 后运行 ollama pull llama3.2\n支持几十种开源模型本地部署',
    region: 'both'
  }
]

// ═══════════════════════════════════════════════════════════════
// 通讯频道 - 国内 + 国际
// ═══════════════════════════════════════════════════════════════

export const CHANNELS: ChannelDef[] = [
  // ─────────────── 国内频道 ───────────────
  {
    id: 'feishu', name: '飞书', alias: 'Lark',
    color: '#3370ff', icon: '飞',
    desc: '字节跳动飞书机器人',
    help: '1. 在飞书开放平台 open.feishu.cn 创建企业自建应用\n2. 获取 App ID 和 App Secret\n3. 在权限管理中添加机器人相关权限\n4. 发布应用并获取机器人 webhook 地址',
    fields: [
      { key: 'appId', label: 'App ID', secret: false, placeholder: 'cli_xxxxxxxxxxxxxxxx' },
      { key: 'appSecret', label: 'App Secret', secret: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'encryptKey', label: 'Encrypt Key (可选)', secret: true, placeholder: '用于事件订阅加密' },
      { key: 'verificationToken', label: 'Verification Token (可选)', secret: true, placeholder: '用于验证请求来源' }
    ],
    extraConfig: { dmPolicy: 'allowlist' }
  },
  {
    id: 'wecom', name: '企业微信', alias: 'WeCom',
    color: '#07c160', icon: '企',
    desc: '企业微信自建应用机器人',
    help: '1. 登录企业微信管理后台 work.weixin.qq.com\n2. 应用管理 → 创建应用\n3. 获取 AgentId 和 Secret\n4. 在接收消息中设置回调 URL',
    fields: [
      { key: 'corpId', label: '企业 ID (CorpID)', secret: false, placeholder: 'wwxxxxxxxxxxxxxxxx' },
      { key: 'agentId', label: 'AgentId', secret: false, placeholder: '1000002' },
      { key: 'secret', label: 'Secret', secret: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'token', label: 'Token (接收消息)', secret: true, placeholder: '可选，用于消息回调' },
      { key: 'encodingAesKey', label: 'EncodingAESKey', secret: true, placeholder: '可选，消息加密密钥' }
    ],
    extraConfig: { dmPolicy: 'allowlist' }
  },
  {
    id: 'qq', name: 'QQ', alias: 'QQ 机器人',
    color: '#12b7f5', icon: 'Q',
    desc: 'QQ 官方机器人（频道/群聊）',
    help: '1. 访问 q.qq.com 进入 QQ 开放平台\n2. 创建机器人应用\n3. 在开发设置中获取 AppID 和 AppSecret\n4. 申请沙箱或发布上线',
    fields: [
      { key: 'appId', label: 'App ID', secret: false, placeholder: '1234567890' },
      { key: 'secret', label: 'App Secret', secret: true, placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'token', label: 'Token', secret: true, placeholder: '用于验证回调请求' }
    ],
    extraConfig: { dmPolicy: 'allowlist' }
  },
  {
    id: 'dingtalk', name: '钉钉', alias: 'DingTalk',
    color: '#0089ff', icon: '钉',
    desc: '钉钉企业内部机器人',
    help: '1. 登录钉钉开放平台 open.dingtalk.com\n2. 应用开发 → 企业内部应用 → 创建应用\n3. 获取 AgentId、AppKey 和 AppSecret\n4. 在机器人设置中开启机器人',
    fields: [
      { key: 'agentId', label: 'AgentId', secret: false, placeholder: '123456789' },
      { key: 'appKey', label: 'App Key', secret: false, placeholder: 'dingxxxxxxxxxxxxxxxx' },
      { key: 'appSecret', label: 'App Secret', secret: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }
    ],
    extraConfig: { dmPolicy: 'allowlist' }
  },
  // ─────────────── 国际频道 ───────────────
  {
    id: 'telegram', name: 'Telegram', alias: '电报',
    color: '#0088cc', icon: 'Tg',
    desc: '通过 @BotFather 创建机器人获取 Token',
    help: '1. 在 Telegram 搜索 @BotFather\n2. 发送 /newbot 创建机器人\n3. 复制获得的 Token',
    fields: [
      { key: 'botToken', label: 'Bot Token', secret: true, placeholder: '123456789:ABCdefGHI-jklMNOpqrsTUVwxyz' }
    ],
    extraConfig: { dmPolicy: 'pairing' }
  },
  {
    id: 'discord', name: 'Discord', alias: 'Discord 机器人',
    color: '#5865f2', icon: 'Dc',
    desc: '在 Discord Developer Portal 创建 Bot',
    help: '1. 访问 discord.com/developers/applications\n2. New Application → Bot → Reset Token\n3. 开启 Message Content Intent\n4. 用 OAuth2 URL 邀请到服务器',
    fields: [
      { key: 'token', label: 'Bot Token', secret: true, placeholder: 'MTAxMDI...' }
    ],
    extraConfig: { dmPolicy: 'allowlist' }
  },
  {
    id: 'slack', name: 'Slack', alias: 'Slack 机器人',
    color: '#4a154b', icon: 'Sl',
    desc: '创建 Slack App 并配置 Socket Mode',
    help: '1. 访问 api.slack.com/apps → Create New App\n2. OAuth & Permissions 添加 Bot Scopes\n3. Socket Mode → 生成 App-Level Token\n4. Install App 获取 Bot Token',
    fields: [
      { key: 'botToken', label: 'Bot Token (xoxb-...)', secret: true, placeholder: 'xoxb-1234-5678-abcdef' },
      { key: 'appToken', label: 'App Token (xapp-...)', secret: true, placeholder: 'xapp-1-A0123-9876-xyz' }
    ],
    extraConfig: {}
  },
  {
    id: 'whatsapp', name: 'WhatsApp', alias: 'WhatsApp 扫码登录',
    color: '#25d366', icon: 'Wa',
    desc: '通过 QR 码扫描登录，无需 API Token',
    help: '1. 启动 OpenClaw 后运行: openclaw channels login\n2. 用手机 WhatsApp 扫描终端中的二维码\n3. 登录后 session 会自动保存',
    fields: [],
    extraConfig: { dmPolicy: 'pairing' }
  }
]
