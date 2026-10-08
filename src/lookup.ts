import type { LookupAddress } from 'node:dns'
import type { LookupFunction } from 'node:net'

import dns from 'node:dns'
import net from 'node:net'

export interface CachedLookup extends LookupFunction {
  /** @returns undefined if hostname is IP or already resolved */
  warmUp: (hostname: string) => Promise<void> | undefined
  /** number of address families (1 or 2) of warmed up host */
  getFamiliesCount: (hostname: string) => number
}

const normalizeFamily = (family: unknown): number => {
  if (family === 'IPv4') return 4
  if (family === 'IPv6') return 6

  return Number(family) || 0
}

const firstOfEveryFamily = (addresses: LookupAddress[]): LookupAddress[] => {
  const families = new Set<number>()

  return addresses.filter(({ family }) => {
    if (families.has(family)) return false

    families.add(family)

    return true
  })
}

/**
 * Creates `lookup` function compatible with `net.connect({ lookup })`.
 * Every hostname is resolved only once per created function.
 */
export function createCachedLookup (): CachedLookup {
  const cache = new Map<string, Promise<LookupAddress[]>>()
  const warmed = new Map<string, Promise<void> | number>()

  const resolve = (hostname: string): Promise<LookupAddress[]> => {
    let promise = cache.get(hostname)

    if (promise === undefined) {
      promise = dns.promises
        .lookup(hostname, { all: true })
        .then(firstOfEveryFamily)
      promise.catch(() => {})
      cache.set(hostname, promise)
    }

    return promise
  }

  const lookup: LookupFunction = (hostname, rawOptions, callback) => {
    const options: { family?: unknown; all?: boolean } =
      typeof rawOptions === 'object' && rawOptions !== null
        ? rawOptions
        : { family: rawOptions }
    const family = normalizeFamily(options.family)

    resolve(hostname).then(
      (addresses) => {
        const filtered =
          family === 0
            ? addresses
            : addresses.filter((a) => a.family === family)
        const first = filtered[0]

        if (first === undefined) {
          const error: NodeJS.ErrnoException = Object.assign(
            new Error(`getaddrinfo ENOTFOUND ${hostname}`),
            { code: 'ENOTFOUND', hostname }
          )

          callback(error, '')
        } else if (options.all === true) {
          callback(null, filtered)
        } else {
          callback(null, first.address, first.family)
        }
      },
      (error: NodeJS.ErrnoException) => callback(error, '')
    )
  }

  const warmUp = (hostname: string): Promise<void> | undefined => {
    if (net.isIP(hostname) !== 0) return

    let promise = warmed.get(hostname)

    if (promise === undefined) {
      promise = resolve(hostname).then(
        (addresses) => {
          warmed.set(hostname, Math.max(1, addresses.length))
        },
        () => {
          warmed.set(hostname, 1)
        }
      )
      warmed.set(hostname, promise)
    }

    return typeof promise === 'number' ? undefined : promise
  }

  const getFamiliesCount = (hostname: string): number => {
    const count = warmed.get(hostname)

    return typeof count === 'number' ? count : 1
  }

  return Object.assign(lookup, { warmUp, getFamiliesCount })
}
