import tcpExistsChunk from './chunk.js'

/**
 * Attention: passed list will be empty after execution
 * @param {[string, string|number][]} endpoints
 * @param {object} [options]
 * @param {number} [options.chunkSize=1400]
 * @param {number} [options.timeout=160] - ms. Best timeout usually is tenth of the chunkSize plus 10-20ms, but minimum 100ms
 * @param {boolean} [options.returnOnlyExisted=true]
 * @param {AbortSignal} [options.signal]
 * @return {AsyncIterable<[string, string|number, boolean][]>}
 */
async function * tcpExistsMany (endpoints, options) {
  const {
    chunkSize = 1400,
    timeout = 160,
    returnOnlyExisted = true,
    signal
  } = options || {}

  while (endpoints.length > 0 && signal?.aborted !== true) {
    const chunk = endpoints.splice(0, chunkSize)

    yield await tcpExistsChunk(chunk, { timeout, returnOnlyExisted, signal })
  }
}

export default tcpExistsMany
