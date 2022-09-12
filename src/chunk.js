import tcpExistsOne from './one.js'
import { DEFAULT_TIMEOUT } from './stuff.js'

/**
 * @param {string} host
 * @param {string|number} port
 * @param {number} timeout
 * @param {AbortSignal} signal
 * @return {Promise<TcpExistsResult>}
 */
async function processOne (host, port, timeout, signal) {
  const exist = await tcpExistsOne(host, port, timeout, signal)

  return [host, port, exist]
}

/**
 * @param {Iterable<TcpExistsEndpoint>} endpoints
 * @param {object} [options]
 * @param {number} [options.timeout=DEFAULT_TIMEOUT] - ms. Best timeout usually is tenth of the endpoints size plus 10-20ms, but minimum 100ms
 * @param {boolean} [options.returnOnlyExisted=true]
 * @param {AbortSignal} [options.signal]
 * @return {Promise<TcpExistsResult[]>}
 */
async function tcpExistsChunk (endpoints, options) {
  const {
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {}

  const promises = []

  for (const [host, port] of endpoints) {
    promises.push(processOne(host, port, timeout, signal))
  }

  const result = await Promise.all(promises)

  return returnOnlyExisted ? result.filter((item) => item[2]) : result
}

export default tcpExistsChunk
