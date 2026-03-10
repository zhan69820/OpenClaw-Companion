import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window

  // 配置自动更新
  autoUpdater.autoDownload = false // 不自动下载，让用户选择
  autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

  // 检查更新事件
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    showUpdateDialog(info)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No update available')
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent}%`)
    // 可以发送进度到渲染进程显示下载进度条
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:progress', progress)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded')
    showInstallDialog(info)
  })
}

function showUpdateDialog(info: { version: string; releaseNotes?: string }): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const result = dialog.showMessageBoxSync(mainWindow, {
    type: 'info',
    title: '发现新版本',
    message: `OpenClaw Companion ${info.version} 已发布`,
    detail: info.releaseNotes || '修复了一些问题并添加了新功能。',
    buttons: ['立即下载', '稍后提醒', '查看更新日志'],
    defaultId: 0,
    cancelId: 1
  })

  if (result === 0) {
    // 立即下载
    autoUpdater.downloadUpdate()
  } else if (result === 2) {
    // 查看更新日志
    shell.openExternal('https://openclaw.n8ndx.com')
  }
}

function showInstallDialog(info: { version: string }): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const result = dialog.showMessageBoxSync(mainWindow, {
    type: 'info',
    title: '更新已下载',
    message: `OpenClaw Companion ${info.version} 已准备好安装`,
    detail: '是否现在重启应用以完成更新？',
    buttons: ['立即重启', '稍后手动重启'],
    defaultId: 0,
    cancelId: 1
  })

  if (result === 0) {
    autoUpdater.quitAndInstall()
  }
}

// 手动检查更新
export function checkForUpdates(): void {
  // 开发环境不检查更新
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping update check in development mode')
    return
  }

  autoUpdater.checkForUpdates().catch(err => {
    console.error('Failed to check for updates:', err)
  })
}

// 获取更新状态
export function getUpdaterStatus(): {
  checking: boolean
  available: boolean
  downloaded: boolean
  version?: string
} {
  return {
    checking: false,
    available: false,
    downloaded: false
  }
}
