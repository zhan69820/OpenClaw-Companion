import { autoUpdater } from 'electron-updater'
import { BrowserWindow, shell } from 'electron'

let mainWindow: BrowserWindow | null = null
let silentMode = false

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    // 静默模式不发送 checking 事件（避免弹窗）
    if (!silentMode) {
      send('update:checking')
    }
  })

  autoUpdater.on('update-available', (info) => {
    send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes || ''
    })
  })

  autoUpdater.on('update-not-available', () => {
    // 静默模式不发送 not-available 事件（避免弹窗）
    if (!silentMode) {
      send('update:not-available')
    }
  })

  autoUpdater.on('error', (err) => {
    // 静默模式不发送错误事件
    if (!silentMode) {
      send('update:error', { message: err.message })
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    send('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send('update:downloaded', { version: info.version })
  })
}

function send(channel: string, payload?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

export function checkForUpdates(silent = false): void {
  if (process.env.NODE_ENV === 'development') {
    return
  }
  silentMode = silent
  autoUpdater.checkForUpdates().catch(err => {
    console.error('Failed to check for updates:', err)
    if (!silentMode) {
      send('update:error', { message: err.message })
    }
  })
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch(err => {
    console.error('Failed to download update:', err)
    send('update:error', { message: err.message })
  })
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}

export function openReleasePage(): void {
  shell.openExternal('https://openclaw.n8ndx.com')
}
