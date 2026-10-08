import type { CheckEndpointOptions } from './one.js'
import type {
  TcpExistsEndpoints,
  TcpExistsManyOptions,
  TcpExistsResult
} from './types.js'

import { checkEndpoint } from './one.js'
import { createCachedLookup } from './lookup.js'
import { createTimeoutEstimator, validateTimeout } from './timeout.js'
import {
  getEndpoints,
  validateEndpoint,
  DEFAULT_CONCURRENCY,
  AUTO_TIMEOUT
} from './utilities.js'

type Source =
  | { isAsync: true; iterator: AsyncIterator<unknown> }
  | { isAsync: false; iterator: Iterator<unknown> }

const hasMethod = (value: unknown, key: symbol): boolean =>
  typeof (value as Record<symbol, unknown> | null | undefined)?.[key] ===
  'function'

function getSource (endpoints: unknown): Source {
  const iterable =
    typeof endpoints === 'string' ? getEndpoints(endpoints) : endpoints

  if (hasMethod(iterable, Symbol.asyncIterator)) {
    return {
      isAsync: true,
      iterator: (iterable as AsyncIterable<unknown>)[Symbol.asyncIterator]()
    }
  }

  if (hasMethod(iterable, Symbol.iterator)) {
    return {
      isAsync: false,
      iterator: (iterable as Iterable<unknown>)[Symbol.iterator]()
    }
  }

  throw new TypeError(
    'endpoints must be a string, an Iterable or an AsyncIterable of [host, port]'
  )
}

/**
 * Checks endpoints keeping at most `concurrency` connections at once.
 * A new connection starts as soon as any previous one is finished.
 * Results are yielded one by one in order of completion (not in order of input).
 *
 * Throws TypeError on invalid `endpoints` or `timeout`,
 * RangeError with code `ERR_INVALID_ENDPOINT` on invalid endpoint.
 * @param endpoints - string in format `host:port,port2; host2; host3:port0-port9`
 *    or any (async) iterable of [host, port]
 * @param options
 * @see https://github.com/JerryCauser/tcp-exists#best-timeout-and-concurrency
 */
async function * tcpExistsMany (
  endpoints: TcpExistsEndpoints,
  options: TcpExistsManyOptions = {}
): AsyncGenerator<TcpExistsResult, void, undefined> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    timeout = AUTO_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options

  const source = getSource(endpoints)
  const validTimeout = validateTimeout(timeout)
  const estimator =
    validTimeout === AUTO_TIMEOUT ? createTimeoutEstimator() : null
  const limit =
    Number.isInteger(concurrency) && concurrency > 0
      ? concurrency
      : DEFAULT_CONCURRENCY

  const active = new Set<() => void>()
  let aborted = false
  const abort = (): void => {
    aborted = true
    for (const cancel of active) cancel()
  }
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted === true) aborted = true

  const lookup = createCachedLookup()
  const ready: TcpExistsResult[] = []
  let readyHead = 0
  let inFlight = 0
  let sourceDone = false
  let wake: (() => void) | null = null

  const start = (host: string, port: number): void => {
    ++inFlight

    const checkOptions: CheckEndpointOptions = {
      lookup,
      active,
      attempts: lookup.getFamiliesCount(host)
    }

    if (estimator !== null) {
      checkOptions.onRtt = (rtt) => estimator.update(host, rtt)
    }

    checkEndpoint(
      host,
      port,
      estimator === null ? (validTimeout as number) : estimator.get(host),
      checkOptions
    ).then((exist) => {
      --inFlight
      if (!aborted) ready.push([host, port, exist])
      wake?.()
    })
  }

  const canStart = (): boolean =>
    !sourceDone && !aborted && inFlight + ready.length - readyHead < limit

  try {
    while (true) {
      while (canStart()) {
        const next = source.isAsync
          ? await source.iterator.next()
          : source.iterator.next()

        if (next.done === true) {
          sourceDone = true
          break
        }

        const [host, port] = validateEndpoint(next.value)
        const warmingUp = lookup.warmUp(host)
        if (warmingUp !== undefined) await warmingUp

        if (aborted) break

        start(host, port)
      }

      if (readyHead < ready.length) {
        const result = ready[readyHead++] as TcpExistsResult

        if (readyHead === ready.length) {
          ready.length = 0
          readyHead = 0
        }

        if (!returnOnlyExisted || result[2]) yield result

        continue
      }

      if (inFlight === 0 && (sourceDone || aborted)) return

      await new Promise<void>((resolve) => {
        wake = resolve
      })
      wake = null
    }
  } finally {
    abort()
    signal?.removeEventListener('abort', abort)
    if (!sourceDone) await source.iterator.return?.()
  }
}

export default tcpExistsMany
