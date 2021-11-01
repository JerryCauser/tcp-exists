import tcpExistsChunk from './chunk.mjs'

/**
 * Attention: passed list will be empty after execution
 * @param {[string, string|number][]} endpoints
 * @param {object} [options]
 * @param {number} [options.timeout=1000] - ms
 * @param {number} [options.chunkSize=4096]
 * @param {boolean} [options.returnOnlyExisted=true]
 * @param {AbortSignal} [options.signal]
 * @return {AsyncGenerator<[string, string|number, boolean][]>}
 */
async function * tcpExistsMany (endpoints, options) {
  const {
    timeout = 1000,
    chunkSize = 4096,
    returnOnlyExisted = true,
    signal
  } = options || {}

  while (endpoints.length > 0 && signal?.aborted !== true) {
    const chunk = endpoints.splice(0, chunkSize)

    yield await tcpExistsChunk(chunk, { timeout, returnOnlyExisted, signal })
  }
}

export default tcpExistsMany
