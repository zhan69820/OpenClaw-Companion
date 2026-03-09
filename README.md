# OpenClaw Companion

OpenClaw Companion 是 [OpenClaw](https://github.com/nicepkg/openclaw) AI 机器人框架的桌面配置管理工具。通过可视化界面替代手动编辑 YAML 配置文件，让 OpenClaw 的安装、配置、备份和迁移变得简单。

## 功能特性

### 模型配置中心

支持 18+ 大模型提供商的可视化配置，填写 API Key 即可使用，其余参数自动填充。

**国内模型：** 通义千问 / DeepSeek / Kimi / 智谱GLM / 文心一言 / 豆包 / 讯飞星火 / 零一万物 / MiniMax / 腾讯混元 / 硅基流动 / 阶跃星辰

**国际模型：** OpenAI / Claude / Gemini / Grok / Mistral

**聚合 & 本地：** OpenRouter / Ollama

- 自动获取可用模型列表
- 推荐模型一键填入
- 备选模型（Fallback）配置
- 国内/国际分组展示

### 通信频道配置

**国内频道：** 飞书 / 企业微信 / QQ / 钉钉

**国际频道：** Telegram / Discord / Slack / WhatsApp

- 开关式启用/禁用
- 每个频道附带详细配置指引

### 备份与迁移

- 一键备份整个 `.openclaw` 数据目录（配置、记忆、历史）为 `.tar.gz` 文件
- 从备份文件恢复所有数据
- 自动备份（每天/每周/每月），可设置保留份数
- 完整的跨设备迁移指南

### 故障诊断

- 一键体检配置文件、模型配置、端口状态
- 端口占用检测工具

### 配置预览

- 实时预览将要写入的 YAML 配置内容

### 一键卸载

- 扫描 OpenClaw 安装组件（npm 包、配置目录、备份文件）
- 可选择保留配置/数据以便将来重新安装

### 其他

- 多语言支持：中文 / English / Espanol
- 深色/浅色主题切换
- 自定义无边框窗口

## 技术栈

- **框架：** Electron 35 + Vue 3 + TypeScript
- **构建：** electron-vite + electron-builder
- **样式：** Tailwind CSS 3
- **状态管理：** Pinia
- **路由：** Vue Router 4
- **图标：** Lucide Icons
- **UI 组件：** Radix Vue

## 快速开始

### 环境要求

- Node.js 22+
- npm 10+

### 安装依赖

```bash
git clone https://github.com/zhan69820/OpenClaw-Companion.git
cd OpenClaw-Companion
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建打包

```bash
# 编译
npm run build

# Windows (NSIS 安装包 + 便携版)
npm run package:win

# macOS (DMG, 需在 macOS 上构建)
npm run package:mac

# Linux (AppImage + deb)
npm run package:linux
```

构建产物在 `release/` 目录下。

## 项目结构

```
OpenClaw-Companion/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts       # 窗口创建与生命周期
│   │   ├── ipc.ts         # IPC 通信处理（配置读写、备份、卸载）
│   │   ├── config.ts      # 配置文件解析
│   │   ├── doctor.ts      # 故障诊断逻辑
│   │   └── llm-test.ts    # 模型连通性测试
│   ├── preload/           # 预加载脚本（暴露安全 API）
│   │   └── index.ts
│   └── renderer/          # Vue 3 前端
│       └── src/
│           ├── views/             # 页面组件
│           │   ├── LLMHub.vue         # 模型配置
│           │   ├── ChannelManager.vue # 频道管理
│           │   ├── BackupMigrate.vue  # 备份迁移
│           │   ├── Doctor.vue         # 故障诊断
│           │   ├── ConfigPreview.vue  # 配置预览
│           │   └── Uninstall.vue      # 卸载管理
│           ├── components/        # 公共组件
│           ├── composables/       # 组合式函数（i18n）
│           ├── stores/            # Pinia 状态管理
│           ├── lib/               # 常量与工具函数
│           └── router/            # 路由配置
├── build/                 # 应用图标
├── electron-builder.yml   # 打包配置
├── electron.vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 跨平台构建

详细的跨平台构建步骤请参考 [BUILD-GUIDE.md](./BUILD-GUIDE.md)。

| 平台 | 格式 | 构建环境要求 |
|------|------|-------------|
| Windows | NSIS 安装包 + 便携版 (.exe) | Windows |
| macOS | DMG | macOS |
| Linux | AppImage + deb | Linux |

> 注意：Electron 应用需要在目标平台上构建，无法跨平台打包（如不能在 Windows 上构建 DMG）。

## 开发说明

### 主要命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 编译项目
npm run package      # 编译 + 打包当前平台
npm run package:win  # 打包 Windows
npm run package:mac  # 打包 macOS
npm run package:linux # 打包 Linux
```

### IPC 通信架构

主进程（Node.js）和渲染进程（Vue）通过 IPC 通信：

```
渲染进程 (Vue)  ──invoke──>  preload (安全桥接)  ──handle──>  主进程 (Node.js)
   window.api.xxx()          ipcRenderer.invoke()          ipcMain.handle()
```

主要 IPC 通道：

| 通道 | 说明 |
|------|------|
| `config:*` | 配置文件的读取、保存、自动检测 |
| `backup:*` | 备份创建、恢复、打开文件夹 |
| `autoBackup:*` | 自动备份设置与执行 |
| `doctor:*` | 故障诊断检查 |
| `llm:*` | 模型列表获取、连通性测试 |
| `uninstall:*` | 卸载扫描与执行 |

## 许可证

MIT
