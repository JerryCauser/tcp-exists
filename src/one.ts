import type { CachedLookup } from './lookup.js'

import net from 'node:net'
import { createCachedLookup } from './lookup.js'
import { validateTimeout } from './timeout.js'
import { DEFAULT_TIMEOUT, validateEndpoint } from './utilities.js'

export interface CheckEndpointOptions {
  signal?: AbortSignal
  /** custom dns lookup for `net.connect` */
  lookup?: CachedLookup
  /** number of address families of the host, every one gets its own `timeout` */
  attempts?: number
  /** cancel functions of connections in flight */
  active?: Set<() => void>
  /** called with round-trip time in ms if host has answered (port is open or refused) */
  onRtt?: (rtt: number) => void
}

const isRefused = (error: unknown): boolean => {
  const { code, errors } = (error ?? {}) as {
    code?: unknown
    errors?: unknown
  }

  return (
    code === 'ECONNREFUSED' ||
    (Array.isArray(errors) &&
      errors.some((e) => (e as { code?: unknown })?.code === 'ECONNREFUSED'))
  )
}

/**
 * check if tcp address exists or not.
 * Internal version with custom dns lookup and cancellation support.
 * @param host
 * @param port
 * @param timeout - ms for every connection attempt
 * @param options
 */
export function checkEndpoint (
  host: string,
  port: number | string,
  timeout: number,
  options: CheckEndpointOptions = {}
): Promise<boolean> {
  const { signal, lookup, attempts = 1, active, onRtt } = options

  return new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve(false)

      return
    }

    let socket: net.Socket | undefined
    let timer: NodeJS.Timeout | undefined
    let attemptStartedAt = performance.now()
    let finished = false

    const finish = (exist: boolean): void => {
      if (finished) return
      finished = true

      clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      active?.delete(cancel)
      if (socket !== undefined && !socket.destroyed) socket.destroy()
      resolve(exist)
    }
    const cancel = (): void => finish(false)
    const measure = (): void => onRtt?.(performance.now() - attemptStartedAt)

    signal?.addEventListener('abort', cancel, { once: true })
    active?.add(cancel)

    try {
      socket = net.connect({
        port: Number(port),
        host,
        lookup,
        autoSelectFamilyAttemptTimeout: Math.max(10, Math.round(timeout))
      })
      timer = setTimeout(
        () => setImmediate(finish, false),
        timeout * Math.max(1, attempts)
      )
      socket.on('connectionAttempt', () => {
        attemptStartedAt = performance.now()
      })
      socket.once('connect', () => {
        measure()
        finish(true)
      })
      socket.once('error', (error) => {
        if (isRefused(error)) measure()
        finish(false)
      })
    } catch {
      finish(false)
    }
  })
}

/** Resolves when promise is settled or signal is aborted */
async function untilSettledOrAborted (
  promise: Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  if (signal === undefined) {
    await promise

    return
  }

  let onAbort: (() => void) | undefined

  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        onAbort = resolve
        signal.addEventListener('abort', onAbort, { once: true })
      })
    ])
  } finally {
    if (onAbort !== undefined) signal.removeEventListener('abort', onAbort)
  }
}

/**
 * check if tcp address exists or not.
 * If host has both IPv6 and IPv4 addresses, every one gets its own timeout.
 *
 * Throws RangeError with code `ERR_INVALID_ENDPOINT` on invalid host or port,
 * TypeError on invalid `timeout`.
 * @param host
 * @param port
 * @param timeout - connection timeout in ms. **Default:** `DEFAULT_TIMEOUT`
 * @param signal - closes socket and returns `false` ASAP
 */
async function tcpExistsOne (
  host: string,
  port: number | string,
  timeout: number = DEFAULT_TIMEOUT,
  signal?: AbortSignal
): Promise<boolean> {
  const [validHost, validPort] = validateEndpoint([host, port])
  const validTimeout = validateTimeout(timeout)
  const fixedTimeout = validTimeout === 'auto' ? DEFAULT_TIMEOUT : validTimeout

  const lookup = createCachedLookup()
  const warmingUp = lookup.warmUp(validHost)

  if (warmingUp !== undefined) await untilSettledOrAborted(warmingUp, signal)

  return await checkEndpoint(validHost, validPort, fixedTimeout, {
    signal,
    lookup,
    attempts: lookup.getFamiliesCount(validHost)
  })
}

export default tcpExistsOne
