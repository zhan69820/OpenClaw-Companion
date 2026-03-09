# OpenClaw Companion 跨平台构建指南

## 项目结构

```
OpenClawCompanion/
├── src/
│   ├── main/          # Electron 主进程 (Node.js)
│   ├── preload/       # 预加载脚本
│   └── renderer/      # Vue 3 前端
├── build/             # 应用图标
├── out/               # 构建输出 (electron-vite)
├── release/           # 打包输出 (electron-builder)
└── electron-builder.yml
```

## 前置要求

所有平台都需要：
- **Node.js 22+** (https://nodejs.org)
- **npm** (随 Node.js 安装)

验证安装：
```bash
node --version  # 应显示 v22.x.x
npm --version   # 应显示 10.x.x
```

---

## macOS 构建步骤

### 1. 准备环境

在 macOS 终端中执行：

```bash
# 安装 Node.js 22 (使用 Homebrew)
brew install node@22

# 或从官网下载安装包
# https://nodejs.org/dist/v22.14.0/node-v22.14.0.pkg

# 验证
node --version
npm --version
```

### 2. 获取项目代码

**方式一：复制文件夹**
将整个 `OpenClawCompanion` 文件夹从 Windows 复制到 Mac（U盘/云盘/SCP）

**方式二：Git 克隆（如果已推送到远程）**
```bash
git clone <你的仓库地址>
cd OpenClawCompanion
```

### 3. 安装依赖

```bash
cd OpenClawCompanion

# 删除 Windows 的 node_modules（如果有）
rm -rf node_modules
rm -rf out
rm -rf release

# 安装依赖
npm install
```

### 4. 构建应用

```bash
# 构建渲染进程和主进程
npm run build

# 打包 DMG
npx electron-builder --mac --config electron-builder.yml
```

### 5. 输出文件

构建完成后，在 `release/` 目录下：
- `OpenClaw Companion-1.0.0.dmg` - 标准安装包
- `OpenClaw Companion-1.0.0-arm64.dmg` - Apple Silicon 专用
- `OpenClaw Companion-1.0.0-x64.dmg` - Intel Mac 专用

### 6. 测试运行

```bash
# 直接运行未打包版本
open release/mac/OpenClaw Companion.app

# 或安装 DMG 后从 Applications 启动
```

---

## Linux 构建步骤 (AppImage + deb)

### 1. 准备环境

**Ubuntu/Debian:**
```bash
# 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装构建依赖
sudo apt-get install -y build-essential libarchive-tools
```

**CentOS/RHEL/Fedora:**
```bash
# 安装 Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# 或 Fedora
sudo dnf install -y nodejs npm
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

验证：
```bash
node --version  # v22.x.x
npm --version   # 10.x.x
```

### 2. 获取项目代码

```bash
# 复制项目文件夹到 Linux，然后
cd OpenClawCompanion

# 清理 Windows 依赖
rm -rf node_modules
rm -rf out
rm -rf release
```

### 3. 安装依赖并构建

```bash
# 安装依赖
npm install

# 构建
npm run build

# 打包 Linux 版本
npx electron-builder --linux --config electron-builder.yml
```

### 4. 输出文件

在 `release/` 目录下：
- `OpenClaw Companion-1.0.0.AppImage` - 通用可执行格式，双击运行
- `openclaw-companion_1.0.0_amd64.deb` - Debian/Ubuntu 安装包

### 5. 测试运行

**AppImage:**
```bash
chmod +x "release/OpenClaw Companion-1.0.0.AppImage"
./release/OpenClaw\ Companion-1.0.0.AppImage
```

**deb 包:**
```bash
sudo dpkg -i release/openclaw-companion_1.0.0_amd64.deb

# 如果依赖缺失
sudo apt-get install -f

# 运行
openclaw-companion
```

---

## Windows 重新构建步骤

如果需要在 Windows 上重新构建：

```bash
cd OpenClawCompanion

# 清理
rmdir /s /q node_modules
rmdir /s /q out
rmdir /s /q release

# 安装依赖
npm install

# 构建
npm run build

# 打包
npx electron-builder --win --config electron-builder.yml
```

输出：
- `release/OpenClaw Companion Setup 1.0.0.exe` - 安装版
- `release/OpenClaw Companion 1.0.0.exe` - 便携版

---

## 常见问题

### Q: macOS 构建提示 "cannot find valid identity"
A: 没有 Apple Developer 证书时，添加参数跳过签名：
```bash
npx electron-builder --mac --config electron-builder.yml -c.mac.identity=null
```

### Q: Linux AppImage 提示 FUSE 错误
A: 某些系统需要安装 FUSE：
```bash
# Ubuntu/Debian
sudo apt-get install libfuse2

# 或使用 --appimage-extract 解压后运行
./OpenClaw\ Companion-1.0.0.AppImage --appimage-extract
./squashfs-root/openclaw-companion
```

### Q: 构建时内存不足
A: Node.js 内存限制，添加参数：
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Q: 如何同时构建所有平台？
A: 需要分别在对应操作系统上构建，或使用 CI/CD（GitHub Actions 等）

---

## 快速检查清单

构建前确认：
- [ ] Node.js 22+ 已安装
- [ ] 项目代码已完整复制（包含 src/, build/, package.json 等）
- [ ] 删除了其他平台的 node_modules
- [ ] 网络连接正常（下载 Electron 二进制文件）

构建后检查：
- [ ] release/ 目录有对应平台的安装包
- [ ] 安装包大小合理（约 80-120MB）
- [ ] 能正常启动运行
- [ ] 模型配置、频道配置、备份功能正常
