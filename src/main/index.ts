import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { initUpdater, checkForUpdates } from './updater'

let ipcRegistered = false

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // IPC handlers 只注册一次，避免重复注册报错
  if (!ipcRegistered) {
    registerIpcHandlers(mainWindow)
    ipcRegistered = true
  }

  initUpdater(mainWindow)

  setTimeout(() => {
    checkForUpdates()
  }, 3000)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.openclaw.companion')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  app.on('activate', () => {
    // macOS: 点击 Dock 图标时，若窗口已存在则聚焦，否则重建
    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) {
      createWindow()
    } else {
      windows[0].show()
      windows[0].focus()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
