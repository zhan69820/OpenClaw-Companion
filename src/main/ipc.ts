import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync, statSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, createReadStream } from 'fs'
import { join } from 'path'
import { homedir, tmpdir } from 'os'
import { ConfigManager } from './config'
import { testLLMConnection, fetchModels } from './llm-test'
import { checkPort } from './doctor'
import { checkForUpdates } from './updater'

const execAsync = promisify(exec)

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // OpenClaw 进程管理
  let openclawProcess: ChildProcess | null = null
  const openclawLogPath = join(homedir(), '.openclaw', 'companion-logs.txt')
  const configManager = new ConfigManager()

  // ── 窗口控制 ──
  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window:close', () => mainWindow.close())
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized())

  // ── 配置管理 ──
  ipcMain.handle('config:detect', async () => {
    return configManager.detectConfigPath()
  })

  ipcMain.handle('config:load', async (_e, filePath?: string) => {
    return configManager.loadConfig(filePath)
  })

  ipcMain.handle('config:save', async (_e, data: Record<string, unknown>) => {
    return configManager.saveConfig(data)
  })

  ipcMain.handle('config:backup', async () => {
    return configManager.backupConfig()
  })

  ipcMain.handle('config:selectFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 OpenClaw 配置文件',
      filters: [
        { name: 'YAML / JSON', extensions: ['yaml', 'yml', 'json'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: false, message: '已取消' }
    return configManager.loadConfig(result.filePaths[0])
  })

  ipcMain.handle('config:export', async (_e, data: Record<string, unknown>) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出配置文件',
      defaultPath: 'openclaw.yaml',
      filters: [
        { name: 'YAML', extensions: ['yaml', 'yml'] },
        { name: 'JSON', extensions: ['json'] }
      ]
    })
    if (result.canceled || !result.filePath) return { ok: false, message: '已取消' }
    return configManager.exportConfig(data, result.filePath)
  })

  // ── LLM 测试 ──
  ipcMain.handle('llm:test', async (_e, opts: {
    baseUrl: string; apiKey: string; apiType: string; model: string
  }) => {
    return testLLMConnection(opts)
  })

  ipcMain.handle('llm:fetchModels', async (_e, opts: {
    baseUrl: string; apiKey: string; apiType: string
  }) => {
    return fetchModels(opts)
  })

  // ── 故障检测 ──
  ipcMain.handle('doctor:checkPort', async (_e, port: number) => {
    return checkPort(port)
  })

  // ── OpenClaw 检测与安装 ──
  ipcMain.handle('openclaw:check', async () => {
    try {
      const { stdout } = await execAsync('openclaw --version')
      return { installed: true, version: stdout.trim() }
    } catch {
      // 尝试检测全局 npm 包
      try {
        const { stdout } = await execAsync('npm list -g openclaw')
        if (stdout.includes('openclaw')) {
          return { installed: true, version: 'unknown' }
        }
      } catch {
        // 忽略
      }
      return { installed: false }
    }
  })

  ipcMain.handle('openclaw:install', async () => {
    const platform = process.platform
    
    try {
      if (platform === 'win32') {
        // Windows: 使用 PowerShell 脚本安装
        const installCmd = 'powershell -ExecutionPolicy Bypass -Command "iwr https://openclaw.ai/install.ps1 -useb | iex"'
        const { stderr } = await execAsync(installCmd, { timeout: 600000 })
        if (stderr && !stderr.includes('WARN')) {
          return { success: false, message: stderr }
        }
        return { success: true, message: 'OpenClaw 安装成功' }
      } else {
        // macOS/Linux: 使用 CLI 安装脚本（无需 root 权限）
        let installCmd = 'curl -fsSL https://openclaw.ai/install-cli.sh | bash'
        
        if (platform === 'darwin') {
          // macOS: 检测是否为 Apple Silicon，强制使用原生 arm64 架构执行
          // 避免 Electron 以 Rosetta (x64) 运行时导致脚本下载错误架构的 Node.js
          try {
            await execAsync('/usr/bin/arch -arm64 true')
            // 硬件支持 arm64，强制以 arm64 执行安装脚本
            installCmd = '/usr/bin/arch -arm64 bash -c \'curl -fsSL https://openclaw.ai/install-cli.sh | bash\''
          } catch {
            // Intel Mac，直接执行
          }
        }
        
        const { stderr } = await execAsync(installCmd, { timeout: 600000 })
        
        if (stderr && !stderr.includes('WARN')) {
          return { success: false, message: stderr }
        }
        
        return { success: true, message: 'OpenClaw 安装成功' }
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: error?.message || '安装失败，请尝试手动安装' 
      }
    }
    }
  })

  // ── OpenClaw 进程管理 ──
  ipcMain.handle('openclaw:start', async () => {
    if (openclawProcess && !openclawProcess.killed) {
      return { ok: false, message: 'OpenClaw 已在运行中' }
    }

    try {
      // 确保日志目录存在
      const logDir = join(homedir(), '.openclaw')
      if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })

      // 启动 OpenClaw
      openclawProcess = spawn('openclaw', ['start'], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      // 写入日志
      const logStream = createReadStream(openclawLogPath)
      openclawProcess.stdout?.on('data', (data) => {
        try {
          writeFileSync(openclawLogPath, data.toString(), { flag: 'a' })
        } catch { /* ignore */ }
      })
      openclawProcess.stderr?.on('data', (data) => {
        try {
          writeFileSync(openclawLogPath, data.toString(), { flag: 'a' })
        } catch { /* ignore */ }
      })

      openclawProcess.on('exit', (code) => {
        console.log(`OpenClaw exited with code ${code}`)
        openclawProcess = null
      })

      // 等待一下确认启动成功
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (openclawProcess && !openclawProcess.killed) {
        return { ok: true, message: 'OpenClaw 启动成功', pid: openclawProcess.pid }
      } else {
        return { ok: false, message: 'OpenClaw 启动失败' }
      }
    } catch (error: any) {
      return { ok: false, message: error?.message || '启动失败' }
    }
  })

  ipcMain.handle('openclaw:stop', async () => {
    if (!openclawProcess || openclawProcess.killed) {
      // 尝试通过命令停止
      try {
        await execAsync('openclaw stop', { timeout: 10000 })
        return { ok: true, message: 'OpenClaw 已停止' }
      } catch {
        return { ok: false, message: 'OpenClaw 未在运行' }
      }
    }

    try {
      openclawProcess.kill('SIGTERM')
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (!openclawProcess.killed) {
        openclawProcess.kill('SIGKILL')
      }

      openclawProcess = null
      return { ok: true, message: 'OpenClaw 已停止' }
    } catch (error: any) {
      return { ok: false, message: error?.message || '停止失败' }
    }
  })

  ipcMain.handle('openclaw:status', async () => {
    const isRunning = openclawProcess && !openclawProcess.killed

    // 尝试通过端口检测确认状态
    let portStatus = false
    try {
      const portCheck = await checkPort(3000) // OpenClaw 默认端口
      portStatus = portCheck.inUse
    } catch { /* ignore */ }

    return {
      running: isRunning || portStatus,
      pid: openclawProcess?.pid || null,
      port: portStatus ? 3000 : null
    }
  })

  ipcMain.handle('openclaw:getLogs', async () => {
    try {
      if (!existsSync(openclawLogPath)) {
        return { ok: true, logs: '暂无日志' }
      }
      const logs = readFileSync(openclawLogPath, 'utf-8')
      // 只返回最后 500 行避免过大
      const lines = logs.split('\n')
      const recentLogs = lines.slice(-500).join('\n')
      return { ok: true, logs: recentLogs }
    } catch (error: any) {
      return { ok: false, message: error?.message || '读取日志失败' }
    }
  })

  ipcMain.handle('openclaw:clearLogs', async () => {
    try {
      if (existsSync(openclawLogPath)) {
        writeFileSync(openclawLogPath, '', 'utf-8')
      }
      return { ok: true }
    } catch (error: any) {
      return { ok: false, message: error?.message || '清除日志失败' }
    }
  })

  // ── 备份与迁移 ──
  ipcMain.handle('backup:getInfo', async () => {
    const home = homedir()
    const openclawDir = join(home, '.openclaw')

    if (!existsSync(openclawDir)) {
      return { ok: false, message: '未找到 .openclaw 目录', path: openclawDir }
    }

    // 统计文件数量和大小
    let fileCount = 0
    let totalSize = 0

    function walk(dir: string) {
      try {
        const entries = readdirSync(dir)
        for (const entry of entries) {
          const fullPath = join(dir, entry)
          try {
            const stat = statSync(fullPath)
            if (stat.isDirectory()) {
              walk(fullPath)
            } else {
              fileCount++
              totalSize += stat.size
            }
          } catch { /* skip inaccessible */ }
        }
      } catch { /* skip */ }
    }

    walk(openclawDir)
    return {
      ok: true,
      path: openclawDir,
      fileCount,
      totalSize,
      sizeDisplay: totalSize < 1024 * 1024
        ? `${(totalSize / 1024).toFixed(1)} KB`
        : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
    }
  })

  ipcMain.handle('backup:create', async () => {
    const home = homedir()
    const openclawDir = join(home, '.openclaw')

    if (!existsSync(openclawDir)) {
      return { ok: false, message: '未找到 .openclaw 目录' }
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存 OpenClaw 备份',
      defaultPath: `openclaw-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`,
      filters: [
        { name: '压缩备份', extensions: ['tar.gz'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { ok: false, message: '已取消' }
    }

    try {
      // Use tar command for simplicity and cross-platform support
      const platform = process.platform
      const tarCmd = platform === 'win32'
        ? `tar -czf "${result.filePath}" -C "${home}" .openclaw`
        : `tar -czf "${result.filePath}" -C "${home}" .openclaw`

      await execAsync(tarCmd, { timeout: 300000 })
      
      return { ok: true, message: `备份已保存至 ${result.filePath}`, path: result.filePath }
    } catch (error: any) {
      return { ok: false, message: `备份失败: ${error?.message || '未知错误'}` }
    }
  })

  ipcMain.handle('backup:restore', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 OpenClaw 备份文件',
      filters: [
        { name: '压缩备份', extensions: ['tar.gz', 'tgz'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, message: '已取消' }
    }

    const backupFile = result.filePaths[0]
    const home = homedir()
    const openclawDir = join(home, '.openclaw')

    try {
      // Backup existing config first
      if (existsSync(openclawDir)) {
        const bakDir = openclawDir + `-bak-${Date.now()}`
        const platform = process.platform
        const mvCmd = platform === 'win32'
          ? `move "${openclawDir}" "${bakDir}"`
          : `mv "${openclawDir}" "${bakDir}"`
        await execAsync(mvCmd, { timeout: 30000 })
      }

      // Extract backup
      mkdirSync(openclawDir, { recursive: true })
      const extractCmd = `tar -xzf "${backupFile}" -C "${home}"`
      await execAsync(extractCmd, { timeout: 300000 })

      return { ok: true, message: '恢复成功！已将备份数据还原到 .openclaw 目录' }
    } catch (error: any) {
      return { ok: false, message: `恢复失败: ${error?.message || '未知错误'}` }
    }
  })

  ipcMain.handle('backup:openFolder', async () => {
    const home = homedir()
    const openclawDir = join(home, '.openclaw')
    if (existsSync(openclawDir)) {
      shell.openPath(openclawDir)
      return { ok: true }
    }
    return { ok: false, message: '目录不存在' }
  })

  // ── 自动备份设置 ──
  const settingsPath = join(homedir(), '.openclaw', 'companion-settings.json')

  function loadAutoBackupConfig(): { enabled: boolean; interval: string; backupDir: string; keepCount: number } {
    const defaults = {
      enabled: false,
      interval: 'daily',
      backupDir: join(homedir(), 'OpenClaw-Backups'),
      keepCount: 10
    }
    try {
      if (existsSync(settingsPath)) {
        const raw = readFileSync(settingsPath, 'utf-8')
        const saved = JSON.parse(raw)
        return { ...defaults, ...saved.autoBackup }
      }
    } catch { /* ignore */ }
    return defaults
  }

  function saveAutoBackupConfig(): void {
    try {
      const dir = join(homedir(), '.openclaw')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      let existing: Record<string, unknown> = {}
      try {
        if (existsSync(settingsPath)) {
          existing = JSON.parse(readFileSync(settingsPath, 'utf-8'))
        }
      } catch { /* ignore */ }
      existing.autoBackup = { ...autoBackupConfig }
      writeFileSync(settingsPath, JSON.stringify(existing, null, 2), 'utf-8')
    } catch { /* ignore */ }
  }

  const autoBackupConfig = loadAutoBackupConfig()

  let autoBackupTimer: NodeJS.Timeout | null = null

  function getBackupFilename(): string {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '-') // HH-MM
    return `openclaw-backup-${dateStr}_${timeStr}.tar.gz`
  }

  async function performAutoBackup(): Promise<{ ok: boolean; message: string; path?: string }> {
    const home = homedir()
    const openclawDir = join(home, '.openclaw')

    if (!existsSync(openclawDir)) {
      return { ok: false, message: '未找到 .openclaw 目录' }
    }

    // 确保备份目录存在
    if (!existsSync(autoBackupConfig.backupDir)) {
      mkdirSync(autoBackupConfig.backupDir, { recursive: true })
    }

    const backupPath = join(autoBackupConfig.backupDir, getBackupFilename())

    try {
      // 执行 tar 备份
      const platform = process.platform
      const tarCmd = platform === 'win32'
        ? `tar -czf "${backupPath}" -C "${home}" .openclaw`
        : `tar -czf "${backupPath}" -C "${home}" .openclaw`

      await execAsync(tarCmd, { timeout: 300000 })

      // 清理旧备份，只保留最近的 keepCount 份
      await cleanupOldBackups()

      return { ok: true, message: `自动备份完成: ${backupPath}`, path: backupPath }
    } catch (error: any) {
      return { ok: false, message: `自动备份失败: ${error?.message || '未知错误'}` }
    }
  }

  async function cleanupOldBackups(): Promise<void> {
    if (!existsSync(autoBackupConfig.backupDir)) return

    try {
      const files = readdirSync(autoBackupConfig.backupDir)
        .filter(f => f.startsWith('openclaw-backup-') && f.endsWith('.tar.gz'))
        .map(f => ({
          name: f,
          path: join(autoBackupConfig.backupDir, f),
          mtime: statSync(join(autoBackupConfig.backupDir, f)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

      // 删除超出保留数量的旧备份
      if (files.length > autoBackupConfig.keepCount) {
        const toDelete = files.slice(autoBackupConfig.keepCount)
        for (const file of toDelete) {
          try {
            unlinkSync(file.path)
          } catch { /* skip */ }
        }
      }
    } catch { /* skip cleanup errors */ }
  }

  function scheduleAutoBackup(): void {
    if (autoBackupTimer) {
      clearInterval(autoBackupTimer)
      autoBackupTimer = null
    }

    if (!autoBackupConfig.enabled) return

    let intervalMs = 24 * 60 * 60 * 1000 // daily default
    if (autoBackupConfig.interval === 'weekly') intervalMs = 7 * 24 * 60 * 60 * 1000
    if (autoBackupConfig.interval === 'monthly') intervalMs = 30 * 24 * 60 * 60 * 1000

    autoBackupTimer = setInterval(async () => {
      await performAutoBackup()
    }, intervalMs)

    // 立即执行一次备份
    performAutoBackup()
  }

  ipcMain.handle('autobackup:getSettings', () => {
    return { ...autoBackupConfig }
  })

  ipcMain.handle('autobackup:setSettings', (_e, settings: {
    enabled?: boolean
    interval?: string
    backupDir?: string
    keepCount?: number
  }) => {
    if (settings.enabled !== undefined) autoBackupConfig.enabled = settings.enabled
    if (settings.interval) autoBackupConfig.interval = settings.interval
    if (settings.backupDir) autoBackupConfig.backupDir = settings.backupDir
    if (settings.keepCount !== undefined) autoBackupConfig.keepCount = settings.keepCount

    saveAutoBackupConfig()
    scheduleAutoBackup()
    return { ok: true, config: { ...autoBackupConfig } }
  })

  ipcMain.handle('autobackup:selectDir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择自动备份保存位置',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false }
    }

    return { ok: true, path: result.filePaths[0] }
  })

  ipcMain.handle('autobackup:list', async () => {
    if (!existsSync(autoBackupConfig.backupDir)) {
      return { ok: true, backups: [] }
    }

    try {
      const files = readdirSync(autoBackupConfig.backupDir)
        .filter(f => f.startsWith('openclaw-backup-') && f.endsWith('.tar.gz'))
        .map(f => {
          const stat = statSync(join(autoBackupConfig.backupDir, f))
          return {
            name: f,
            path: join(autoBackupConfig.backupDir, f),
            size: stat.size,
            sizeDisplay: stat.size < 1024 * 1024
              ? `${(stat.size / 1024).toFixed(1)} KB`
              : `${(stat.size / (1024 * 1024)).toFixed(1)} MB`,
            created: stat.mtime.toISOString(),
            createdDisplay: stat.mtime.toLocaleString()
          }
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

      return { ok: true, backups: files }
    } catch (error: any) {
      return { ok: false, message: error?.message || '读取备份列表失败' }
    }
  })

  ipcMain.handle('autobackup:runNow', async () => {
    return performAutoBackup()
  })

  // 启动时调度自动备份
  scheduleAutoBackup()

  // ── 卸载 OpenClaw ──
  ipcMain.handle('uninstall:scan', async () => {
    const home = homedir()
    const platform = process.platform
    const items: Array<{
      id: string
      label: string
      path: string
      exists: boolean
      size: string
      removable: boolean
      defaultChecked: boolean
    }> = []

    // 1. 全局 npm 包
    let npmVersion = ''
    try {
      const { stdout } = await execAsync('npm list -g openclaw --depth=0')
      if (stdout.includes('openclaw')) {
        const match = stdout.match(/openclaw@([\d.]+)/)
        npmVersion = match ? match[1] : 'unknown'
      }
    } catch { /* not installed via npm */ }

    items.push({
      id: 'npm-package',
      label: `OpenClaw npm 全局包${npmVersion ? ' (v' + npmVersion + ')' : ''}`,
      path: 'npm uninstall -g openclaw',
      exists: !!npmVersion,
      size: '',
      removable: true,
      defaultChecked: true
    })

    // 2. .openclaw 目录（配置、记忆、数据）
    const openclawDir = join(home, '.openclaw')
    let openclawDirInfo = { exists: false, size: '0 KB' }
    if (existsSync(openclawDir)) {
      let totalSize = 0
      function walkSize(dir: string) {
        try {
          for (const entry of readdirSync(dir)) {
            const p = join(dir, entry)
            try {
              const s = statSync(p)
              if (s.isDirectory()) walkSize(p)
              else totalSize += s.size
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
      walkSize(openclawDir)
      openclawDirInfo = {
        exists: true,
        size: totalSize < 1024 * 1024
          ? `${(totalSize / 1024).toFixed(1)} KB`
          : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
      }
    }

    items.push({
      id: 'config-dir',
      label: '配置和数据目录 (~/.openclaw)',
      path: openclawDir,
      exists: openclawDirInfo.exists,
      size: openclawDirInfo.size,
      removable: true,
      defaultChecked: true
    })

    // 3. 自动备份目录
    const backupsDir = join(home, 'OpenClaw-Backups')
    let backupsDirInfo = { exists: false, size: '0 KB' }
    if (existsSync(backupsDir)) {
      let totalSize = 0
      try {
        for (const f of readdirSync(backupsDir)) {
          try { totalSize += statSync(join(backupsDir, f)).size } catch { /* skip */ }
        }
      } catch { /* skip */ }
      backupsDirInfo = {
        exists: true,
        size: totalSize < 1024 * 1024
          ? `${(totalSize / 1024).toFixed(1)} KB`
          : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
      }
    }

    items.push({
      id: 'backups-dir',
      label: '自动备份目录 (~/OpenClaw-Backups)',
      path: backupsDir,
      exists: backupsDirInfo.exists,
      size: backupsDirInfo.size,
      removable: true,
      defaultChecked: false
    })

    return { ok: true, items }
  })

  // ── 检查更新 ──
  ipcMain.handle('updater:check', async () => {
    checkForUpdates()
    return { ok: true }
  })

  ipcMain.handle('uninstall:execute', async (_e, selectedIds: string[]) => {
    const home = homedir()
    const platform = process.platform
    const results: Array<{ id: string; ok: boolean; message: string }> = []

    for (const id of selectedIds) {
      try {
        if (id === 'npm-package') {
          const cmd = platform === 'win32'
            ? 'npm uninstall -g openclaw'
            : 'sudo npm uninstall -g openclaw'
          await execAsync(cmd, { timeout: 60000 })
          results.push({ id, ok: true, message: 'OpenClaw npm 包已卸载' })
        } else if (id === 'config-dir') {
          const dir = join(home, '.openclaw')
          if (existsSync(dir)) {
            const rmCmd = platform === 'win32'
              ? `rmdir /s /q "${dir}"`
              : `rm -rf "${dir}"`
            await execAsync(rmCmd, { timeout: 60000 })
          }
          results.push({ id, ok: true, message: '配置目录已删除' })
        } else if (id === 'backups-dir') {
          const dir = join(home, 'OpenClaw-Backups')
          if (existsSync(dir)) {
            const rmCmd = platform === 'win32'
              ? `rmdir /s /q "${dir}"`
              : `rm -rf "${dir}"`
            await execAsync(rmCmd, { timeout: 60000 })
          }
          results.push({ id, ok: true, message: '备份目录已删除' })
        }
      } catch (error: any) {
        results.push({ id, ok: false, message: error?.message || '操作失败' })
      }
    }

    return { ok: results.every(r => r.ok), results }
  })
}
