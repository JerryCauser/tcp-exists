import net from 'node:net'
import { DEFAULT_TIMEOUT } from './stuff.js'

/**
 * @param {function} resolve
 * @param {net.Socket} socket
 */
const handleFail = (resolve, socket) => {
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
 * @param {string} host
 * @param {number|string} port
 * @param {number} [timeout=100] - ms
 * @param {AbortSignal} [signal]
 * @return {Promise<boolean>}
 */
async function tcpExistsOne (host, port, timeout = DEFAULT_TIMEOUT, signal) {
  return await new Promise((resolve) => {
    let socket

    try {
      socket = net.connect({ port, host, signal })
      socket.setTimeout(timeout)
      socket.once('connect', () => handleSuccess(resolve, socket))
      socket.once('error', () => handleFail(resolve, socket))
      socket.once('timeout', () => handleFail(resolve, socket))
    } catch (e) {
      handleFail(resolve, socket)
    }
  })
}

export default tcpExistsOne
