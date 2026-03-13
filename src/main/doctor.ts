import net from 'net'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, accessSync, constants } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const execAsync = promisify(exec)

export function checkPort(port: number): Promise<{ inUse: boolean; message: string }> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ inUse: true, message: `端口 ${port} 已被占用` })
      } else {
        resolve({ inUse: false, message: `检测端口时出错: ${err.message}` })
      }
    })
    server.once('listening', () => {
      server.close()
      resolve({ inUse: false, message: `端口 ${port} 可用` })
    })
    server.listen(port, '127.0.0.1')
  })
}

function getShellEnv(): Record<string, string> {
  const env = { ...process.env }
  const home = homedir()
  const platform = process.platform
  const extraPaths: string[] = []

  if (platform === 'darwin') {
    extraPaths.push(
      '/usr/local/bin', '/opt/homebrew/bin',
      join(home, '.nvm/versions/node') + '/*/bin',
      join(home, '.npm-global/bin'),
      '/usr/local/lib/node_modules/.bin'
    )
  } else if (platform === 'win32') {
    extraPaths.push(
      join(process.env.APPDATA || '', 'npm'),
      'C:\\Program Files\\nodejs',
      'C:\\Program Files\\Git\\bin'
    )
  } else {
    extraPaths.push(
      '/usr/local/bin',
      join(home, '.npm-global/bin'),
      join(home, '.nvm/versions/node') + '/*/bin'
    )
  }

  const sep = platform === 'win32' ? ';' : ':'
  env.PATH = extraPaths.join(sep) + sep + (env.PATH || '')
  return env
}

async function runCmd(cmd: string, timeout = 10000): Promise<{ stdout: string; stderr: string }> {
  const env = getShellEnv()
  const shell = process.platform === 'win32' ? undefined : '/bin/bash'
  return execAsync(cmd, { timeout, env, shell })
}

export interface DiagnosticItem {
  id: string
  label: string
  category: string
  status: 'ok' | 'warn' | 'error'
  message: string
  fixable: boolean
  fixHint?: string
}

export async function runDiagnostics(): Promise<DiagnosticItem[]> {
  const results: DiagnosticItem[] = []
  const platform = process.platform
  const home = homedir()

  // 1. Node.js 检测
  try {
    const { stdout } = await runCmd('node --version')
    const ver = stdout.trim()
    const major = parseInt(ver.replace('v', ''))
    if (major >= 18) {
      results.push({ id: 'node', label: 'Node.js 环境', category: '环境', status: 'ok', message: `已安装 ${ver}`, fixable: false })
    } else {
      results.push({ id: 'node', label: 'Node.js 环境', category: '环境', status: 'warn', message: `版本过低 ${ver}，建议 >= 18`, fixable: false, fixHint: '请升级 Node.js: https://nodejs.org' })
    }
  } catch {
    results.push({ id: 'node', label: 'Node.js 环境', category: '环境', status: 'error', message: '未检测到 Node.js', fixable: false, fixHint: '请安装 Node.js: https://nodejs.org' })
  }

  // 2. npm 检测
  try {
    const { stdout } = await runCmd('npm --version')
    results.push({ id: 'npm', label: 'npm 包管理器', category: '环境', status: 'ok', message: `已安装 v${stdout.trim()}`, fixable: false })
  } catch {
    results.push({ id: 'npm', label: 'npm 包管理器', category: '环境', status: 'error', message: '未检测到 npm', fixable: false, fixHint: '安装 Node.js 后会自动包含 npm' })
  }

  // 3. OpenClaw 安装检测
  try {
    const { stdout } = await runCmd('openclaw --version')
    results.push({ id: 'openclaw', label: 'OpenClaw 安装', category: '核心', status: 'ok', message: `已安装 ${stdout.trim()}`, fixable: false })
  } catch {
    results.push({
      id: 'openclaw', label: 'OpenClaw 安装', category: '核心', status: 'error',
      message: '未检测到 openclaw 命令',
      fixable: true,
      fixHint: platform === 'win32'
        ? '在 PowerShell 中执行: iwr https://openclaw.ai/install.ps1 -useb | iex'
        : '在终端中执行: curl -fsSL https://openclaw.ai/install.sh | bash'
    })
  }

  // 4. npm 全局路径 PATH 检测
  try {
    const { stdout } = await runCmd('npm config get prefix')
    const prefix = stdout.trim()
    const binDir = platform === 'win32' ? prefix : join(prefix, 'bin')
    const pathEnv = process.env.PATH || ''
    if (pathEnv.includes(binDir) || pathEnv.includes(prefix)) {
      results.push({ id: 'npm-path', label: 'npm 全局 PATH', category: '环境', status: 'ok', message: `全局 bin 路径已在 PATH 中: ${binDir}`, fixable: false })
    } else {
      results.push({
        id: 'npm-path', label: 'npm 全局 PATH', category: '环境', status: 'warn',
        message: `${binDir} 不在系统 PATH 中，可能导致 openclaw 命令找不到`,
        fixable: false,
        fixHint: platform === 'win32'
          ? `将 ${binDir} 添加到系统环境变量 PATH`
          : `将 export PATH="${binDir}:$PATH" 添加到 ~/.bashrc 或 ~/.zshrc`
      })
    }
  } catch {
    // npm 不存在的情况已经在上面处理
  }

  // 5. Git 检测 (Windows 需要)
  if (platform === 'win32') {
    try {
      const { stdout } = await runCmd('git --version')
      results.push({ id: 'git', label: 'Git 版本管理', category: '环境', status: 'ok', message: `已安装 ${stdout.trim()}`, fixable: false })
    } catch {
      results.push({
        id: 'git', label: 'Git 版本管理', category: '环境', status: 'warn',
        message: '未检测到 Git，使用 git 安装模式时需要',
        fixable: false,
        fixHint: '下载安装: https://git-scm.com/download/win'
      })
    }
  }

  // 6. 配置目录检测
  const openclawDir = join(home, '.openclaw')
  if (existsSync(openclawDir)) {
    try {
      accessSync(openclawDir, constants.R_OK | constants.W_OK)
      results.push({ id: 'data-dir', label: 'OpenClaw 数据目录', category: '数据', status: 'ok', message: `${openclawDir} 存在且可读写`, fixable: false })
    } catch {
      results.push({
        id: 'data-dir', label: 'OpenClaw 数据目录', category: '数据', status: 'error',
        message: `${openclawDir} 权限不足`,
        fixable: true,
        fixHint: platform === 'win32' ? '以管理员身份运行修复' : `执行: chmod -R u+rw "${openclawDir}"`
      })
    }
  } else {
    results.push({ id: 'data-dir', label: 'OpenClaw 数据目录', category: '数据', status: 'warn', message: `${openclawDir} 不存在（首次运行 OpenClaw 后自动创建）`, fixable: false })
  }

  // 7. 配置文件检测
  const configPath = join(openclawDir, 'config.yaml')
  const configPathAlt = join(openclawDir, 'config.yml')
  if (existsSync(configPath) || existsSync(configPathAlt)) {
    results.push({ id: 'config-file', label: 'OpenClaw 配置文件', category: '数据', status: 'ok', message: `配置文件存在`, fixable: false })
  } else if (existsSync(openclawDir)) {
    results.push({ id: 'config-file', label: 'OpenClaw 配置文件', category: '数据', status: 'warn', message: '未找到 config.yaml，请先完成 OpenClaw 初始化设置', fixable: false, fixHint: '执行: openclaw' })
  }

  // 8. 默认端口检测 (3000)
  const port3000 = await checkPort(3000)
  if (port3000.inUse) {
    results.push({
      id: 'port-3000', label: '默认端口 3000', category: '网络', status: 'warn',
      message: '端口 3000 已被占用，OpenClaw 可能无法启动',
      fixable: true,
      fixHint: platform === 'win32'
        ? '执行 netstat -ano | findstr :3000 查看占用进程，用 taskkill /PID <pid> /F 终止'
        : '执行 lsof -i :3000 查看占用进程，用 kill <pid> 终止'
    })
  } else {
    results.push({ id: 'port-3000', label: '默认端口 3000', category: '网络', status: 'ok', message: '端口 3000 可用', fixable: false })
  }

  // 9. Gateway 端口检测 (18789)
  const port18789 = await checkPort(18789)
  if (port18789.inUse) {
    results.push({
      id: 'port-gateway', label: 'Gateway 端口 18789', category: '网络', status: 'warn',
      message: 'Gateway 端口 18789 已被占用，可能有另一个实例在运行',
      fixable: true,
      fixHint: '如果是旧实例占用，可执行: openclaw gateway restart'
    })
  } else {
    results.push({ id: 'port-gateway', label: 'Gateway 端口 18789', category: '网络', status: 'ok', message: 'Gateway 端口 18789 可用', fixable: false })
  }

  // 10. npm 全局权限检测 (Linux/macOS)
  if (platform !== 'win32') {
    try {
      const { stdout } = await runCmd('npm config get prefix')
      const prefix = stdout.trim()
      if (prefix.startsWith('/usr/') && !prefix.includes('.npm-global')) {
        results.push({
          id: 'npm-perm', label: 'npm 全局安装权限', category: '环境', status: 'warn',
          message: `npm 全局前缀为 ${prefix}，非 root 用户安装全局包可能报 EACCES 错误`,
          fixable: true,
          fixHint: '建议将 npm 全局前缀改为用户目录: npm config set prefix ~/.npm-global'
        })
      } else {
        results.push({ id: 'npm-perm', label: 'npm 全局安装权限', category: '环境', status: 'ok', message: `npm 全局前缀: ${prefix}`, fixable: false })
      }
    } catch {
      // npm 不存在已在前面处理
    }
  }

  return results
}

export async function fixItem(id: string): Promise<{ ok: boolean; message: string }> {
  const platform = process.platform

  switch (id) {
    case 'openclaw': {
      // 打开终端安装 OpenClaw
      try {
        if (platform === 'win32') {
          await execAsync(
            'start powershell -NoExit -ExecutionPolicy Bypass -Command "iwr https://openclaw.ai/install.ps1 -useb | iex"',
            { timeout: 10000 }
          )
          return { ok: true, message: '正在打开 PowerShell 安装窗口...' }
        } else if (platform === 'darwin') {
          const script = `curl -fsSL https://openclaw.ai/install.sh | bash`
          await execAsync(
            `osascript -e 'tell application "Terminal" to do script "${script}"' -e 'tell application "Terminal" to activate'`,
            { timeout: 10000 }
          )
          return { ok: true, message: '正在打开终端安装 OpenClaw...' }
        } else {
          const terms = ['gnome-terminal -- bash -c', 'xterm -e', 'konsole -e bash -c']
          const script = 'curl -fsSL https://openclaw.ai/install.sh | bash; exec bash'
          for (const t of terms) {
            try {
              await execAsync(`${t} "${script}"`, { timeout: 5000 })
              return { ok: true, message: '正在打开终端安装 OpenClaw...' }
            } catch { continue }
          }
          return { ok: false, message: '无法打开终端，请手动执行: curl -fsSL https://openclaw.ai/install.sh | bash' }
        }
      } catch (e: any) {
        return { ok: false, message: e.message }
      }
    }

    case 'data-dir': {
      // 修复数据目录权限
      const home = homedir()
      const dir = join(home, '.openclaw')
      try {
        if (platform !== 'win32') {
          await execAsync(`chmod -R u+rw "${dir}"`, { timeout: 10000 })
        }
        return { ok: true, message: '权限修复完成' }
      } catch (e: any) {
        return { ok: false, message: `修复失败: ${e.message}` }
      }
    }

    case 'port-3000':
    case 'port-gateway': {
      // 查找并显示占用端口的进程信息
      const port = id === 'port-3000' ? 3000 : 18789
      try {
        let info = ''
        if (platform === 'win32') {
          const { stdout } = await runCmd(`netstat -ano | findstr :${port}`)
          info = stdout.trim()
        } else {
          const { stdout } = await runCmd(`lsof -i :${port} -t`)
          const pids = stdout.trim()
          if (pids) {
            const { stdout: psOut } = await runCmd(`ps -p ${pids.split('\n')[0]} -o comm=`)
            info = `PID: ${pids.split('\n')[0]}, 进程: ${psOut.trim()}`
          }
        }
        return { ok: true, message: info ? `占用信息: ${info}` : '未能获取占用进程信息' }
      } catch {
        return { ok: false, message: '无法获取端口占用信息' }
      }
    }

    case 'npm-perm': {
      // 修复 npm 全局路径权限
      try {
        const home = homedir()
        const globalDir = join(home, '.npm-global')
        if (!existsSync(globalDir)) {
          await execAsync(`mkdir -p "${globalDir}"`, { timeout: 5000 })
        }
        await execAsync('npm config set prefix ~/.npm-global', { timeout: 5000, env: getShellEnv() })
        return { ok: true, message: `npm 全局前缀已设为 ${globalDir}，请重启终端后生效` }
      } catch (e: any) {
        return { ok: false, message: `修复失败: ${e.message}` }
      }
    }

    default:
      return { ok: false, message: '不支持的修复项' }
  }
}
