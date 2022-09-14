import tcpExistsChunk from './chunk.js'
import {
  getEndpoints,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_TIMEOUT,
  DEFAULT_PORTS
} from './utilities.js'

/**
 * Attention: passed list will be empty after execution
 * @param {[string, string|number][]|string} endpoints
 * @param {object} [options]
 * @param {number} [options.chunkSize=1400]
 * @param {number} [options.timeout=160] - ms.
 *    How to pick best timeout: https://github.com/JerryCauser/tcp-exists#best-timeout-and-chunksize
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

  if (Array.isArray(endpoints)) {
    while (endpoints.length > 0 && signal?.aborted !== true) {
      const chunk = endpoints.splice(0, chunkSize)

      yield await tcpExistsChunk(chunk, { timeout, returnOnlyExisted, signal })
    }
  } else if (typeof endpoints === 'string') {
    const chunk = []

    for (const item of getEndpoints(endpoints, DEFAULT_PORTS)) {
      if (chunk.push(item) === DEFAULT_CHUNK_SIZE) {
        if (signal?.aborted === true) return

        yield await tcpExistsChunk(chunk, {
          timeout,
          returnOnlyExisted,
          signal
        })
        chunk.length = 0
      }
    }

    if (signal?.aborted === true) return

    yield await tcpExistsChunk(chunk, { timeout, returnOnlyExisted, signal })
    chunk.length = 0
  }
}

export default tcpExistsMany
