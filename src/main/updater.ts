import { autoUpdater } from 'electron-updater'
import { BrowserWindow, shell } from 'electron'

let mainWindow: BrowserWindow | null = null

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    send('update:checking')
  })

  autoUpdater.on('update-available', (info) => {
    send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes || ''
    })
  })

  autoUpdater.on('update-not-available', () => {
    send('update:not-available')
  })

  autoUpdater.on('error', (err) => {
    send('update:error', { message: err.message })
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

export function checkForUpdates(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping update check in development mode')
    return
  }
  autoUpdater.checkForUpdates().catch(err => {
    console.error('Failed to check for updates:', err)
    send('update:error', { message: err.message })
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
