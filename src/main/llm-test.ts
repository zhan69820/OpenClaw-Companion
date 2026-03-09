import https from 'https'
import http from 'http'

interface LLMTestOpts {
  baseUrl: string
  apiKey: string
  apiType: string
  model: string
}

interface FetchModelsOpts {
  baseUrl: string
  apiKey: string
  apiType: string
}

function request(
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: string
    timeout?: number
  }
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : http

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method,
        headers: options.headers,
        timeout: options.timeout || 15000
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve({ status: res.statusCode || 0, body: data }))
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('请求超时'))
    })

    if (options.body) req.write(options.body)
    req.end()
  })
}

export async function testLLMConnection(
  opts: LLMTestOpts
): Promise<{ ok: boolean; message: string; latency?: number }> {
  const start = Date.now()

  try {
    let url: string
    let headers: Record<string, string>
    let body: string

    if (opts.apiType === 'anthropic-messages') {
      url = opts.baseUrl.replace(/\/+$/, '') + '/v1/messages'
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01'
      }
      body = JSON.stringify({
        model: opts.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hi' }]
      })
    } else {
      url = opts.baseUrl.replace(/\/+$/, '') + '/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`
      }
      body = JSON.stringify({
        model: opts.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hi' }]
      })
    }

    const res = await request(url, { method: 'POST', headers, body })
    const latency = Date.now() - start

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, message: `连接成功 (${latency}ms)`, latency }
    } else if (res.status === 401) {
      return { ok: false, message: 'API Key 无效 (401 Unauthorized)' }
    } else if (res.status === 404) {
      return { ok: false, message: `模型 ${opts.model} 不存在 (404)` }
    } else if (res.status === 429) {
      return { ok: false, message: '请求频率过高或余额不足 (429)' }
    } else {
      const snippet = res.body.slice(0, 200)
      return { ok: false, message: `HTTP ${res.status}: ${snippet}` }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `连接失败: ${msg}` }
  }
}

export async function fetchModels(
  opts: FetchModelsOpts
): Promise<{ ok: boolean; models: string[]; message: string }> {
  if (opts.apiType === 'anthropic-messages') {
    return { ok: true, models: [], message: 'Anthropic 不支持自动获取模型列表，请手动选择' }
  }

  try {
    const url = opts.baseUrl.replace(/\/+$/, '') + '/models'
    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.apiKey}`
    }

    const res = await request(url, { method: 'GET', headers, timeout: 10000 })

    if (res.status >= 200 && res.status < 300) {
      const data = JSON.parse(res.body)
      const models: string[] = (data.data || [])
        .map((m: { id: string }) => m.id)
        .sort()
      return { ok: true, models, message: `获取到 ${models.length} 个模型` }
    } else {
      return { ok: false, models: [], message: `获取失败 (HTTP ${res.status})` }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, models: [], message: `获取失败: ${msg}` }
  }
}
