# 跨平台构建 - 文件传输清单

## 必须复制的文件/文件夹

将以下项目从 Windows 复制到 macOS/Linux：

```
OpenClawCompanion/
├── build/                  # 应用图标 (icon.ico, icon.png)
├── src/                    # 源代码 (main, preload, renderer)
├── electron-builder.yml    # 打包配置
├── electron.vite.config.ts # Vite 配置
├── package.json            # 项目依赖
├── tailwind.config.js      # Tailwind 配置
├── tsconfig.json           # TypeScript 配置
├── tsconfig.node.json      # Node TS 配置
├── tsconfig.web.json       # Web TS 配置
└── BUILD-GUIDE.md          # 构建指南
```

## 不需要复制的文件/文件夹

这些可以在目标平台重新生成：

```
node_modules/       # 依赖目录 - 在目标平台运行 npm install
out/                # 构建输出 - 运行 npm run build 生成
release/            # 打包输出 - 运行 electron-builder 生成
dist-release/       # 旧构建输出
release-v2/         # 旧构建输出
package-lock.json   # 可选，npm install 会重新生成
```

## 快速打包命令 (Windows PowerShell)

在 Windows 上执行，准备传输文件：

```powershell
# 创建干净的传输包
Compress-Archive -Path @(
    "build",
    "src",
    "electron-builder.yml",
    "electron.vite.config.ts",
    "package.json",
    "tailwind.config.js",
    "tsconfig.json",
    "tsconfig.node.json",
    "tsconfig.web.json",
    "BUILD-GUIDE.md"
) -DestinationPath "OpenClawCompanion-source.zip" -Force
```

传输后文件大小约 **~5MB**（不含 node_modules）

## 传输方式

1. **U盘/移动硬盘**: 直接复制文件夹
2. **局域网共享**: Windows 共享文件夹，Mac/Linux 挂载
3. **云盘**: 压缩后上传，目标平台下载
4. **SCP/SFTP**: 如果有服务器中转

## 目标平台准备步骤

### macOS
```bash
# 1. 解压/复制项目到桌面
cd ~/Desktop/OpenClawCompanion

# 2. 安装 Node.js 22
brew install node@22
# 或下载 pkg 安装包

# 3. 安装依赖
npm install

# 4. 构建
npm run build

# 5. 打包 DMG
npx electron-builder --mac --config electron-builder.yml
```

### Linux
```bash
# 1. 解压/复制项目
cd ~/OpenClawCompanion

# 2. 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装依赖
npm install

# 4. 构建
npm run build

# 5. 打包 AppImage + deb
npx electron-builder --linux --config electron-builder.yml
```

## 验证文件完整性

传输后检查关键文件是否存在：

```bash
# macOS/Linux
cd OpenClawCompanion
ls -la build/icon.*          # 应该有图标
ls -la src/main/index.ts     # 主进程代码
ls -la src/renderer/src/     # 前端代码
cat package.json | head -5   # 项目配置
```

## 网络要求

构建时需要下载：
- Electron 二进制文件 (~100MB)
- 各种 npm 依赖

确保目标平台有稳定的互联网连接。
