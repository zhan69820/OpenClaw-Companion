import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, extname } from 'path'
import { homedir } from 'os'
import YAML from 'yaml'

function getDefaultConfigPaths(): string[] {
  const home = homedir()
  const platform = process.platform
  const paths: string[] = []

  if (platform === 'win32') {
    const userProfile = process.env.USERPROFILE || home
    paths.push(
      join(userProfile, '.openclaw', 'config.yaml'),
      join(userProfile, '.openclaw', 'openclaw.yaml'),
      join(userProfile, '.openclaw', 'openclaw.json'),
      join(userProfile, '.openclaw', 'config.yml')
    )
  } else if (platform === 'darwin') {
    paths.push(
      join(home, '.openclaw', 'config.yaml'),
      join(home, 'Library', 'Application Support', 'openclaw', 'config.yaml'),
      join(home, '.openclaw', 'openclaw.yaml'),
      join(home, '.openclaw', 'openclaw.json')
    )
  } else {
    paths.push(
      join(home, '.openclaw', 'config.yaml'),
      join(home, '.config', 'openclaw', 'config.yaml'),
      join(home, '.openclaw', 'openclaw.yaml'),
      join(home, '.openclaw', 'openclaw.json')
    )
  }
  return paths
}

function createDefaultConfig(): Record<string, unknown> {
  return {
    models: {
      providers: {}
    },
    agents: {
      defaults: {
        model: {
          primary: '',
          fallbacks: []
        },
        models: {}
      }
    },
    channels: {}
  }
}

export class ConfigManager {
  private configPath: string | null = null
  private rawContent: string = ''

  detectConfigPath(): { ok: boolean; path: string | null; paths: string[] } {
    const paths = getDefaultConfigPaths()
    for (const p of paths) {
      if (existsSync(p)) {
        this.configPath = p
        return { ok: true, path: p, paths }
      }
    }
    return { ok: false, path: null, paths }
  }

  loadConfig(filePath?: string): {
    ok: boolean; data: Record<string, unknown> | null; path: string | null; message: string; format: string
  } {
    const target = filePath || this.configPath
    if (!target) {
      return { ok: false, data: null, path: null, message: '未指定配置文件路径', format: '' }
    }

    try {
      if (!existsSync(target)) {
        // 创建默认配置
        const dir = dirname(target)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        const defaultCfg = createDefaultConfig()
        const content = YAML.stringify(defaultCfg, { indent: 2 })
        writeFileSync(target, content, 'utf-8')
        this.configPath = target
        this.rawContent = content
        return { ok: true, data: defaultCfg, path: target, message: '已创建默认配置文件', format: 'yaml' }
      }

      this.rawContent = readFileSync(target, 'utf-8')
      this.configPath = target

      const ext = extname(target).toLowerCase()
      let data: Record<string, unknown>

      if (ext === '.json') {
        data = JSON.parse(this.rawContent)
        return { ok: true, data, path: target, message: '已加载 JSON 配置', format: 'json' }
      } else {
        data = YAML.parse(this.rawContent) || {}
        return { ok: true, data, path: target, message: '已加载 YAML 配置', format: 'yaml' }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, data: null, path: target, message: `加载失败: ${msg}`, format: '' }
    }
  }

  saveConfig(data: Record<string, unknown>): { ok: boolean; message: string } {
    if (!this.configPath) {
      // 如果没有已知路径，用默认路径
      const paths = getDefaultConfigPaths()
      this.configPath = paths[0]
    }

    try {
      // 先备份
      if (existsSync(this.configPath)) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const bakPath = this.configPath + `.bak_${ts}`
        copyFileSync(this.configPath, bakPath)
      }

      const dir = dirname(this.configPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      const ext = extname(this.configPath).toLowerCase()
      let content: string
      if (ext === '.json') {
        content = JSON.stringify(data, null, 2)
      } else {
        content = YAML.stringify(data, { indent: 2, lineWidth: 0 })
      }

      writeFileSync(this.configPath, content, 'utf-8')
      return { ok: true, message: `已保存至 ${this.configPath}` }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, message: `保存失败: ${msg}` }
    }
  }

  backupConfig(): { ok: boolean; message: string; path?: string } {
    if (!this.configPath || !existsSync(this.configPath)) {
      return { ok: false, message: '没有找到配置文件' }
    }
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const bakPath = this.configPath + `.bak_${ts}`
      copyFileSync(this.configPath, bakPath)
      return { ok: true, message: `已备份至 ${bakPath}`, path: bakPath }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, message: `备份失败: ${msg}` }
    }
  }

  exportConfig(
    data: Record<string, unknown>,
    targetPath: string
  ): { ok: boolean; message: string } {
    try {
      const ext = extname(targetPath).toLowerCase()
      let content: string
      if (ext === '.json') {
        content = JSON.stringify(data, null, 2)
      } else {
        content = YAML.stringify(data, { indent: 2, lineWidth: 0 })
      }
      writeFileSync(targetPath, content, 'utf-8')
      return { ok: true, message: `已导出至 ${targetPath}` }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, message: `导出失败: ${msg}` }
    }
  }
}
