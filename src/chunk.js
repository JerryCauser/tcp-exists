import tcpExistsOne from './one.js'

async function processOne (host, port, timeout, signal) {
  const exist = await tcpExistsOne(host, port, timeout, signal)

  return [host, port, exist]
}

/**
 * @param {[string, string|number][]} endpoints
 * @param {object} [options]
 * @param {number} [options.timeout=500] - ms. Best timeout usually is tenth of the endpoints size plus 10-20ms, but minimum 100ms
 * @param {boolean} [options.returnOnlyExisted=true]
 * @param {AbortSignal} [options.signal]
 * @return {Promise<[string, string|number, boolean][]>}
 */
async function tcpExistsChunk (endpoints, options) {
  const { timeout = 500, returnOnlyExisted = true, signal } = options || {}

  const promises = []

  for (const [host, port] of endpoints) {
    promises.push(processOne(host, port, timeout, signal))
  }

  const result = await Promise.all(promises)

  return returnOnlyExisted ? result.filter((item) => item[2]) : result
}

export default tcpExistsChunk
