import { checkEndpoint } from './one.js'
import { createCachedLookup } from './lookup.js'
import { DEFAULT_TIMEOUT } from './utilities.js'

/**
 * @param {string} host
 * @param {string|number} port
 * @param {number} timeout
 * @param {AbortSignal} signal
 * @param {function} lookup
 * @return {Promise<TcpExistsResult>}
 */
async function processOne (host, port, timeout, signal, lookup) {
  const exist = await checkEndpoint(
    host,
    port,
    timeout,
    signal,
    lookup,
    lookup.getAttempts(host)
  )

  return [host, port, exist]
}

/**
 * Internal version of tcpExistsChunk which can share dns cache between chunks
 * @param {Iterable<TcpExistsEndpoint>} endpoints
 * @param {object} options
 * @param {number} options.timeout - ms.
 * @param {boolean} options.returnOnlyExisted
 * @param {AbortSignal} [options.signal]
 * @param {CachedLookup} lookup
 * @return {Promise<TcpExistsResult[]>}
 */
export async function checkChunk (
  endpoints,
  { timeout, returnOnlyExisted, signal },
  lookup
) {
  const list = Array.from(endpoints)

  await lookup.warmUp(new Set(list.map(([host]) => host)))

  const promises = []

  for (const [host, port] of list) {
    promises.push(processOne(host, port, timeout, signal, lookup))
  }

  const result = await Promise.all(promises)

  return returnOnlyExisted ? result.filter((item) => item[2]) : result
}

let deprecationWarned = false

/**
 * @deprecated will be removed in v2.0.0, use tcpExistsMany instead
 * @param {Iterable<TcpExistsEndpoint>} endpoints
 * @param {object} [options]
 * @param {number} [options.timeout=DEFAULT_TIMEOUT] - ms.
 *    How to pick best timeout: https://github.com/JerryCauser/tcp-exists#best-timeout-and-chunksize
 * @param {boolean} [options.returnOnlyExisted=true]
 * @param {AbortSignal} [options.signal]
 * @return {Promise<TcpExistsResult[]>}
 */
async function tcpExistsChunk (endpoints, options) {
  if (!deprecationWarned) {
    deprecationWarned = true
    process.emitWarning(
      'tcpExistsChunk is deprecated and will be removed in tcp-exists v2.0.0. Use tcpExistsMany instead.',
      'DeprecationWarning',
      'TCP_EXISTS_DEP_CHUNK'
    )
  }

  const {
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {}

  return await checkChunk(
    endpoints,
    { timeout, returnOnlyExisted, signal },
    createCachedLookup()
  )
}

export default tcpExistsChunk
