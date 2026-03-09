import net from 'net'

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
