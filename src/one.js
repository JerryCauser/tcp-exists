import net from 'node:net'
import { createCachedLookup } from './lookup.js'
import { DEFAULT_TIMEOUT } from './utilities.js'

/**
 * check if tcp address exists or not.
 * Internal version with custom dns lookup support
 * @param {string} host
 * @param {number|string} port
 * @param {number} timeout - ms
 * @param {AbortSignal} [signal]
 * @param {function} [lookup] - custom dns lookup for `net.connect`
 * @param {number} [attempts=1] - number of address families of the host, every one gets its own `timeout`
 * @return {Promise<boolean>}
 */
export function checkEndpoint (
  host,
  port,
  timeout,
  signal,
  lookup,
  attempts = 1
) {
  return new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve(false)

      return
    }

    let socket
    let timer
    let finished = false

    const finish = (exist) => {
      if (finished) return
      finished = true

      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (socket && !socket.destroyed) socket.destroy()
      resolve(exist)
    }
    const onAbort = () => finish(false)

    signal?.addEventListener('abort', onAbort, { once: true })

    try {
      socket = net.connect({
        port,
        host,
        lookup,
        autoSelectFamilyAttemptTimeout: Math.max(10, Math.round(timeout))
      })
      timer = setTimeout(
        () => setImmediate(finish, false),
        timeout * Math.max(1, attempts)
      )
      socket.once('connect', () => finish(true))
      socket.once('error', () => finish(false))
    } catch (e) {
      finish(false)
    }
  })
}

/**
 * Resolves when promise is settled or signal is aborted
 * @param {Promise} promise
 * @param {AbortSignal} [signal]
 * @return {Promise<void>}
 */
async function untilSettledOrAborted (promise, signal) {
  if (!signal) {
    await promise

    return
  }

  let onAbort

  try {
    await Promise.race([
      promise,
      new Promise((resolve) => {
        onAbort = resolve
        signal.addEventListener('abort', onAbort, { once: true })
      })
    ])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

/**
 * check if tcp address exists or not.
 * If host has both IPv6 and IPv4 addresses, every one gets its own timeout.
 * @param {string} host
 * @param {number|string} port
 * @param {number} [timeout=DEFAULT_TIMEOUT] - ms
 * @param {AbortSignal} [signal]
 * @return {Promise<boolean>}
 */
async function tcpExistsOne (host, port, timeout = DEFAULT_TIMEOUT, signal) {
  const lookup = createCachedLookup()

  await untilSettledOrAborted(lookup.warmUp([host]), signal)

  return await checkEndpoint(
    host,
    port,
    timeout,
    signal,
    lookup,
    lookup.getAttempts(host)
  )
}

export default tcpExistsOne
