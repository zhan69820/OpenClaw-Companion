import { contextBridge, ipcRenderer } from 'electron'

export type Api = typeof api

const api = {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },
  // 配置管理
  config: {
    detect: () => ipcRenderer.invoke('config:detect'),
    load: (filePath?: string) => ipcRenderer.invoke('config:load', filePath),
    save: (data: Record<string, unknown>) => ipcRenderer.invoke('config:save', data),
    backup: () => ipcRenderer.invoke('config:backup'),
    selectFile: () => ipcRenderer.invoke('config:selectFile'),
    export: (data: Record<string, unknown>) => ipcRenderer.invoke('config:export', data)
  },
  // LLM 测试
  llm: {
    test: (opts: { baseUrl: string; apiKey: string; apiType: string; model: string }) =>
      ipcRenderer.invoke('llm:test', opts),
    fetchModels: (opts: { baseUrl: string; apiKey: string; apiType: string }) =>
      ipcRenderer.invoke('llm:fetchModels', opts)
  },
  // 故障检测
  doctor: {
    checkPort: (port: number) => ipcRenderer.invoke('doctor:checkPort', port)
  },
  // OpenClaw 安装检测
  openclaw: {
    check: () => ipcRenderer.invoke('openclaw:check'),
    install: () => ipcRenderer.invoke('openclaw:install')
  },
  // 备份与迁移
  backup: {
    getInfo: () => ipcRenderer.invoke('backup:getInfo'),
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
    openFolder: () => ipcRenderer.invoke('backup:openFolder')
  },
  // 自动备份
  autoBackup: {
    getSettings: () => ipcRenderer.invoke('autobackup:getSettings'),
    setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('autobackup:setSettings', settings),
    selectDir: () => ipcRenderer.invoke('autobackup:selectDir'),
    list: () => ipcRenderer.invoke('autobackup:list'),
    runNow: () => ipcRenderer.invoke('autobackup:runNow')
  },
  // 卸载
  uninstall: {
    scan: () => ipcRenderer.invoke('uninstall:scan'),
    execute: (selectedIds: string[]) => ipcRenderer.invoke('uninstall:execute', selectedIds)
  },
  // 检查更新
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    onProgress: (callback: (progress: { percent: number }) => void) => {
      ipcRenderer.on('update:progress', (_event, progress) => callback(progress))
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
