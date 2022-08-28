import tcpExistsChunk from './chunk.js'

export const DEFAULT_CHUNK_SIZE = 1400
export const DEFAULT_TIMEOUT = 160

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
    chunkSize = DEFAULT_CHUNK_SIZE,
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {}

  while (endpoints.length > 0 && signal?.aborted !== true) {
    const chunk = endpoints.splice(0, chunkSize)

    yield await tcpExistsChunk(chunk, { timeout, returnOnlyExisted, signal })
  }
}

export default tcpExistsMany
