import tcpExistsChunk from './chunk.js'
import {
  getEndpoints,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_TIMEOUT
} from './utilities.js'

/**
 * Attention: passed list will be empty after execution
 * @param {[string, string|number][]|string} endpoints
 * @param {object} [options]
 * @param {number} [options.chunkSize=DEFAULT_CHUNK_SIZE]
 * @param {number} [options.timeout=DEFAULT_TIMEOUT] - ms.
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

  const size =
    Number.isInteger(chunkSize) && chunkSize > 0
      ? chunkSize
      : DEFAULT_CHUNK_SIZE

  if (Array.isArray(endpoints)) {
    while (endpoints.length > 0 && signal?.aborted !== true) {
      const chunk = endpoints.splice(0, size)

      yield await tcpExistsChunk(chunk, { timeout, returnOnlyExisted, signal })
    }
  } else if (typeof endpoints === 'string') {
    const chunk = []

    for (const item of getEndpoints(endpoints)) {
      if (chunk.push(item) === size) {
        if (signal?.aborted === true) return

        yield await tcpExistsChunk(chunk, {
          timeout,
          returnOnlyExisted,
          signal
        })
        chunk.length = 0
      }
    }

    if (signal?.aborted === true || chunk.length === 0) return

    yield await tcpExistsChunk(chunk, { timeout, returnOnlyExisted, signal })
    chunk.length = 0
  }
}

export default tcpExistsMany
