import dns from 'node:dns'
import net from 'node:net'

/**
 * @param {number|string|undefined} family
 * @return {number}
 */
const normalizeFamily = (family) => {
  if (family === 'IPv4') return 4
  if (family === 'IPv6') return 6

  return Number(family) || 0
}

/**
 * Keeps only the first address of every family, preserving order
 * @param {dns.LookupAddress[]} addresses
 * @return {dns.LookupAddress[]}
 */
const firstOfEveryFamily = (addresses) => {
  const families = new Set()

  return addresses.filter(({ family }) => {
    if (families.has(family)) return false

    families.add(family)

    return true
  })
}

/**
 * Happy eyeballs (trying IPv6 and IPv4 one by one) is enabled by default since node 20
 * @return {boolean}
 */
const isAutoSelectFamilyEnabled = () =>
  typeof net.getDefaultAutoSelectFamily === 'function' &&
  net.getDefaultAutoSelectFamily()

/**
 * Creates `lookup` function compatible with `net.connect({ lookup })`.
 * Every hostname is resolved only once per created function.
 * @return {CachedLookup}
 */
export function createCachedLookup () {
  /** @type {Map<string, Promise<dns.LookupAddress[]>>} */
  const cache = new Map()
  /** @type {Map<string, number>} number of address families of resolved hosts */
  const familiesCount = new Map()

  /**
   * @param {string} hostname
   * @return {Promise<dns.LookupAddress[]>}
   */
  const resolve = (hostname) => {
    let promise = cache.get(hostname)

    if (promise === undefined) {
      promise = dns.promises
        .lookup(hostname, { all: true })
        .then(firstOfEveryFamily)
      promise.then(
        (addresses) => familiesCount.set(hostname, addresses.length),
        () => {}
      )
      cache.set(hostname, promise)
    }

    return promise
  }

  /**
   * @param {string} hostname
   * @param {object|number|function} options
   * @param {function} [callback]
   */
  const lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else if (typeof options !== 'object' || options === null) {
      options = { family: options }
    }

    const family = normalizeFamily(options.family)

    resolve(hostname).then(
      (addresses) => {
        const filtered =
          family === 0
            ? addresses
            : addresses.filter((a) => a.family === family)

        if (filtered.length === 0) {
          const error = new Error(`getaddrinfo ENOTFOUND ${hostname}`)
          error.code = 'ENOTFOUND'
          error.hostname = hostname

          callback(error)
        } else if (options.all) {
          callback(null, filtered)
        } else {
          callback(null, filtered[0].address, filtered[0].family)
        }
      },
      (error) => callback(error)
    )
  }

  /**
   * Resolves hostnames in advance
   * @param {Iterable<string>} hostnames
   * @return {Promise<void>}
   */
  lookup.warmUp = async (hostnames) => {
    const promises = []

    for (const hostname of hostnames) {
      if (net.isIP(hostname) === 0) promises.push(resolve(hostname))
    }

    await Promise.allSettled(promises)
  }

  /**
   * Number of address families (1 or 2) of warmed up hostname, otherwise 1
   * @param {string} hostname
   * @return {number}
   */
  lookup.getAttempts = (hostname) =>
    isAutoSelectFamilyEnabled()
      ? Math.max(1, familiesCount.get(hostname) ?? 1)
      : 1

  return lookup
}
