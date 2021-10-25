import net from 'node:net'

/**
 * @param {function} resolve
 * @param {net.Socket} socket
 */
const handleError = (resolve, socket) => {
  if (socket && !socket.destroyed) socket.destroy()
  resolve(false)
}

/**
 * @param {function} resolve
 * @param {net.Socket} socket
 */
const handleSuccess = (resolve, socket) => {
  socket.destroy()
  resolve(true)
}

/**
 * check if tcp address exists or not
 * @param {string} path
 * @param {number|string} port
 * @param {number} [timeout=100] - ms
 * @return {Promise<boolean>}
 */
async function tcpExists (path, port, timeout = 100) {
  return await new Promise((resolve) => {
    let socket

    try {
      socket = net.connect(port, path)
      socket.setTimeout(timeout)
      socket.once('connect', () => handleSuccess(resolve, socket))
      socket.once('error', () => handleError(resolve, socket))
      socket.once('timeout', () => handleError(resolve, socket))
    } catch (e) {
      handleError(resolve, socket)
    }
  })
}

export default tcpExists
