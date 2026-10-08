import type { LookupFunction } from 'node:net'

import events from 'node:events'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import tcpExistsOne, { checkEndpoint } from '../src/one.js'
import tcpExistsMany from '../src/many.js'
import { DEFAULT_TIMEOUT } from '../src/utilities.js'
import {
  BLACKHOLE_HOST,
  BLACKHOLE_PORT,
  PORT_FROM,
  measure,
  startServers
} from './helpers/servers.js'

let stopServers: () => Promise<void>

beforeAll(async () => {
  stopServers = await startServers()
})

afterAll(async () => {
  await stopServers()
})

describe('tcpExistsOne', () => {
  it('returns true for open port', async () => {
    expect(await tcpExistsOne('localhost', PORT_FROM)).toBe(true)
  })

  it('returns false for closed port', async () => {
    expect(await tcpExistsOne('localhost', PORT_FROM - 1)).toBe(false)
  })

  it('works with IPv4 and IPv6 addresses', async () => {
    expect(await tcpExistsOne('127.0.0.1', PORT_FROM)).toBe(true)
    expect(await tcpExistsOne('::1', PORT_FROM)).toBe(true)
  })

  it('accepts port as string', async () => {
    expect(await tcpExistsOne('localhost', String(PORT_FROM))).toBe(true)
  })

  it('returns false after timeout', async () => {
    expect(
      await measure(tcpExistsOne(BLACKHOLE_HOST, BLACKHOLE_PORT, 300))
    ).toEqual([false, 300])
  })

  it('uses DEFAULT_TIMEOUT by default', async () => {
    expect(await measure(tcpExistsOne(BLACKHOLE_HOST, BLACKHOLE_PORT))).toEqual(
      [false, DEFAULT_TIMEOUT]
    )
  })

  it('returns false right after abort', async () => {
    const ac = new AbortController()
    setTimeout(() => ac.abort(), 200)

    expect(
      await measure(
        tcpExistsOne(BLACKHOLE_HOST, BLACKHOLE_PORT, 2000, ac.signal)
      )
    ).toEqual([false, 200])
  })

  it('returns false for already aborted signal', async () => {
    expect(
      await tcpExistsOne('localhost', PORT_FROM, 1000, AbortSignal.abort())
    ).toBe(false)
  })

  it('throws TypeError on invalid timeout', async () => {
    await expect(tcpExistsOne('localhost', PORT_FROM, 0)).rejects.toThrow(
      TypeError
    )
  })

  it('does not keep abort listeners on signal after finish', async () => {
    const ac = new AbortController()
    const endpoints: Array<[string, number]> = []

    for (let port = PORT_FROM - 20; port < PORT_FROM + 20; ++port) {
      endpoints.push(['localhost', port])
    }

    await Promise.all(
      endpoints.map(([host, port]) => tcpExistsOne(host, port, 100, ac.signal))
    )

    for await (const result of tcpExistsMany(endpoints, {
      signal: ac.signal
    })) {
      expect(result).toBeDefined()
    }

    expect(events.getEventListeners(ac.signal, 'abort')).toHaveLength(0)
  })
})

describe('checkEndpoint', () => {
  it('measures rtt on connect and refuse, but not on timeout', async () => {
    const rtts: number[] = []
    const onRtt = (rtt: number): void => {
      rtts.push(rtt)
    }

    const results = [
      await checkEndpoint('127.0.0.1', PORT_FROM, 1000, { onRtt }),
      await checkEndpoint('127.0.0.1', PORT_FROM - 1, 1000, { onRtt }),
      await checkEndpoint(BLACKHOLE_HOST, BLACKHOLE_PORT, 200, { onRtt })
    ]

    expect(results).toEqual([true, false, false])
    expect(rtts).toHaveLength(2)
    for (const rtt of rtts) {
      expect(rtt).toBeGreaterThanOrEqual(0)
      expect(rtt).toBeLessThan(200)
    }
  })

  it('tries the next address family after timeout of the first one', async () => {
    const addresses = [
      { address: '::ffff:10.255.255.1', family: 6 },
      { address: '127.0.0.1', family: 4 }
    ]
    const lookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all === true) {
        callback(null, addresses)
      } else {
        callback(null, addresses[0]!.address, addresses[0]!.family)
      }
    }

    expect(
      await measure(
        checkEndpoint('dual-stack.test', PORT_FROM, 200, {
          lookup: Object.assign(lookup, {
            warmUp: () => undefined,
            getFamiliesCount: () => 2
          }),
          attempts: 2
        })
      )
    ).toEqual([true, 200])
  })

  it('does not lose answer received while event loop is blocked', async () => {
    const result = checkEndpoint('127.0.0.1', PORT_FROM, 50)
    await new Promise((resolve) => process.nextTick(resolve))
    const blockUntil = Date.now() + 200
    while (Date.now() < blockUntil);

    expect(await result).toBe(true)
  })

  it('cancels connection by active set', async () => {
    const active = new Set<() => void>()
    const result = checkEndpoint(BLACKHOLE_HOST, BLACKHOLE_PORT, 5000, {
      active
    })

    expect(active.size).toBe(1)
    for (const cancel of active) cancel()

    expect(await measure(result)).toEqual([false, 0])
    expect(active.size).toBe(0)
  })
})
