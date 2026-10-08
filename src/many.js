import { checkChunk } from './chunk.js'
import { createCachedLookup } from './lookup.js'
import {
  getEndpoints,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_TIMEOUT
} from './utilities.js'

/**
 * @param {*} value
 * @return {boolean}
 */
const isIterable = (value) =>
  value != null &&
  (typeof value[Symbol.iterator] === 'function' ||
    typeof value[Symbol.asyncIterator] === 'function')

/**
 * @param {string|Iterable<TcpExistsEndpoint>|AsyncIterable<TcpExistsEndpoint>} endpoints
 *    string in format `host:port,port2; host2; host3:port0-port9`
 *    or any (async) iterable of [host, port]. Passed array is not modified.
 * @param {object} [options]
 * @param {number} [options.chunkSize=DEFAULT_CHUNK_SIZE]
 * @param {number} [options.timeout=DEFAULT_TIMEOUT] - ms.
 *    How to pick best timeout: https://github.com/JerryCauser/tcp-exists#best-timeout-and-chunksize
 * @param {boolean} [options.returnOnlyExisted=true]
 * @param {AbortSignal} [options.signal]
 * @return {AsyncIterable<TcpExistsResult[]>}
 */
async function * tcpExistsMany (endpoints, options) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {}

  const source =
    typeof endpoints === 'string' ? getEndpoints(endpoints) : endpoints

  if (!isIterable(source)) {
    throw new TypeError(
      'endpoints must be a string, an Iterable or an AsyncIterable of [host, port]'
    )
  }

  const size =
    Number.isInteger(chunkSize) && chunkSize > 0
      ? chunkSize
      : DEFAULT_CHUNK_SIZE
  const chunkOptions = { timeout, returnOnlyExisted, signal }
  const lookup = createCachedLookup()
  let chunk = []

  for await (const endpoint of source) {
    if (signal?.aborted === true) return

    if (chunk.push(endpoint) === size) {
      const ready = chunk
      chunk = []

      yield await checkChunk(ready, chunkOptions, lookup)
    }
  }

  if (signal?.aborted === true || chunk.length === 0) return

  yield await checkChunk(chunk, chunkOptions, lookup)
}

export default tcpExistsMany
