import type { TcpExistsTimeout } from './types.js'

import {
  AUTO_TIMEOUT,
  DEFAULT_TIMEOUT,
  MIN_AUTO_TIMEOUT,
  MAX_AUTO_TIMEOUT
} from './utilities.js'

// smoothing factors from RFC 6298
const ALPHA = 1 / 8
const BETA = 1 / 4

export interface TimeoutEstimator {
  /** timeout for the next connection to the host, ms */
  get: (host: string) => number
  /** adds measured round-trip time of the host, ms */
  update: (host: string, rtt: number) => void
}

const clamp = (value: number): number =>
  Math.min(MAX_AUTO_TIMEOUT, Math.max(MIN_AUTO_TIMEOUT, Math.round(value)))

/** Throws TypeError if timeout is neither a positive number nor `'auto'` */
export function validateTimeout (timeout: unknown): TcpExistsTimeout {
  if (timeout === AUTO_TIMEOUT) return timeout

  if (typeof timeout === 'number' && Number.isFinite(timeout) && timeout > 0) {
    return timeout
  }

  throw new TypeError(
    `timeout must be a positive number of ms or "${AUTO_TIMEOUT}", got ${String(
      timeout
    )}`
  )
}

/**
 * Estimates connection timeout for every host by measured round-trip times
 * like TCP does for retransmission timeout (RFC 6298):
 * `timeout = srtt + 4 * rttvar`, clamped to [MIN_AUTO_TIMEOUT, MAX_AUTO_TIMEOUT].
 * Until the first sample DEFAULT_TIMEOUT is used.
 */
export function createTimeoutEstimator (): TimeoutEstimator {
  const stats = new Map<string, { srtt: number; rttvar: number }>()

  return {
    get (host) {
      const stat = stats.get(host)

      return stat === undefined
        ? DEFAULT_TIMEOUT
        : clamp(stat.srtt + 4 * stat.rttvar)
    },

    update (host, rtt) {
      const stat = stats.get(host)

      if (stat === undefined) {
        stats.set(host, { srtt: rtt, rttvar: rtt / 2 })

        return
      }

      stat.rttvar = (1 - BETA) * stat.rttvar + BETA * Math.abs(stat.srtt - rtt)
      stat.srtt = (1 - ALPHA) * stat.srtt + ALPHA * rtt
    }
  }
}
