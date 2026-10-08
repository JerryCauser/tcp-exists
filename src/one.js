import net from 'node:net'
import { DEFAULT_TIMEOUT } from './utilities.js'

/**
 * check if tcp address exists or not
 * @param {string} host
 * @param {number|string} port
 * @param {number} [timeout=DEFAULT_TIMEOUT] - ms
 * @param {AbortSignal} [signal]
 * @return {Promise<boolean>}
 */
async function tcpExistsOne (host, port, timeout = DEFAULT_TIMEOUT, signal) {
  return await new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve(false)

      return
    }

    let socket
    let finished = false

    const finish = (exist) => {
      if (finished) return
      finished = true

      signal?.removeEventListener('abort', onAbort)
      if (socket && !socket.destroyed) socket.destroy()
      resolve(exist)
    }
    const onAbort = () => finish(false)

    signal?.addEventListener('abort', onAbort, { once: true })

    try {
      socket = net.connect({ port, host })
      socket.setTimeout(timeout)
      socket.once('connect', () => finish(true))
      socket.once('error', () => finish(false))
      socket.once('timeout', () => setImmediate(finish, false))
    } catch (e) {
      finish(false)
    }
  })
}

export default tcpExistsOne
