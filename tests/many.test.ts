import type {
  TcpExistsEndpoint,
  TcpExistsEndpoints,
  TcpExistsManyOptions,
  TcpExistsResult
} from '../src/types.js'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import tcpExistsMany from '../src/many.js'
import { getEndpoints } from '../src/utilities.js'
import {
  BLACKHOLE_HOST,
  BLACKHOLE_PORT,
  PORT_FROM,
  PORT_TO,
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

const sortResults = (results: TcpExistsResult[]): TcpExistsResult[] =>
  [...results].sort((a, b) =>
    a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1
  )

async function collect (
  endpoints: TcpExistsEndpoints,
  options?: TcpExistsManyOptions
): Promise<TcpExistsResult[]> {
  const result: TcpExistsResult[] = []

  for await (const item of tcpExistsMany(endpoints, options)) result.push(item)

  return sortResults(result)
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, i) => from + i)

const openGold: TcpExistsResult[] = range(PORT_FROM, PORT_TO).map((port) => [
  'localhost',
  port,
  true
])

const smallSource: TcpExistsEndpoint[] = [
  ['localhost', PORT_FROM - 1],
  ['localhost', String(PORT_FROM)],
  ['localhost', PORT_FROM + 1]
]

const smallGold: TcpExistsResult[] = [
  ['localhost', PORT_FROM, true],
  ['localhost', PORT_FROM + 1, true]
]

describe('tcpExistsMany', () => {
  describe('input', () => {
    it('accepts array', async () => {
      const endpoints = range(PORT_FROM - 50, PORT_TO + 50).map(
        (port): TcpExistsEndpoint => ['localhost', port]
      )

      expect(
        await collect(endpoints, { timeout: 100, concurrency: 32 })
      ).toEqual(openGold)
    })

    it('accepts string', async () => {
      expect(
        await collect(`localhost:${PORT_FROM - 50}-${PORT_TO + 50}`, {
          timeout: 100,
          concurrency: 32
        })
      ).toEqual(openGold)
    })

    it('yields nothing for empty string', async () => {
      expect(await collect('')).toEqual([])
    })

    it('accepts string ports in array and does not modify it', async () => {
      const source = smallSource.map((item): TcpExistsEndpoint => [...item])

      expect(await collect(source, { concurrency: 2 })).toEqual(smallGold)
      expect(source).toEqual(smallSource)
    })

    it('accepts Set', async () => {
      expect(await collect(new Set(smallSource))).toEqual(smallGold)
    })

    it('accepts getEndpoints generator', async () => {
      expect(
        await collect(
          getEndpoints(`localhost:${PORT_FROM - 1}-${PORT_FROM + 1}`)
        )
      ).toEqual(smallGold)
    })

    it('accepts async generator', async () => {
      async function * source (): AsyncGenerator<TcpExistsEndpoint> {
        yield * smallSource
      }

      expect(await collect(source(), { concurrency: 2 })).toEqual(smallGold)
    })

    it('accepts AsyncIterable with plain iterator', async () => {
      const source: AsyncIterable<TcpExistsEndpoint> = {
        [Symbol.asyncIterator] () {
          let i = 0

          return {
            next: async () =>
              i < smallSource.length
                ? { done: false, value: smallSource[i++]! }
                : { done: true, value: undefined }
          }
        }
      }

      expect(await collect(source)).toEqual(smallGold)
    })

    it('throws TypeError on non-iterable', async () => {
      // @ts-expect-error invalid input
      await expect(collect(42)).rejects.toThrow(TypeError)
    })

    it('throws RangeError on invalid port in string before scanning', async () => {
      await expect(collect(`localhost:${PORT_FROM},0`)).rejects.toMatchObject({
        name: 'RangeError',
        code: 'ERR_INVALID_ENDPOINT'
      })
    })

    it('throws RangeError on invalid port in iterable', async () => {
      await expect(
        collect([
          ['localhost', PORT_FROM],
          ['localhost', 'abc']
        ])
      ).rejects.toMatchObject({
        name: 'RangeError',
        code: 'ERR_INVALID_ENDPOINT'
      })
    })
  })

  describe('results', () => {
    it('yields single results with numeric port', async () => {
      expect(
        await collect(`localhost:${PORT_FROM - 2}-${PORT_FROM + 1}`, {
          returnOnlyExisted: false
        })
      ).toEqual([
        ['localhost', PORT_FROM - 2, false],
        ['localhost', PORT_FROM - 1, false],
        ['localhost', PORT_FROM, true],
        ['localhost', PORT_FROM + 1, true]
      ])
    })

    it('yields only existed by default', async () => {
      expect(await collect(`localhost:${PORT_FROM - 1}-${PORT_FROM}`)).toEqual([
        ['localhost', PORT_FROM, true]
      ])
    })
  })

  describe('timeout', () => {
    it('works with auto timeout', async () => {
      expect(
        await collect(`localhost:${PORT_FROM - 1}-${PORT_FROM}`, {
          timeout: 'auto'
        })
      ).toEqual([['localhost', PORT_FROM, true]])
    })

    it.each([0, -1, '100', 'fast', NaN, Infinity])(
      'throws TypeError on timeout %j',
      async (timeout) => {
        await expect(
          // @ts-expect-error invalid timeout
          collect(`localhost:${PORT_FROM}`, { timeout })
        ).rejects.toThrow(TypeError)
      }
    )
  })

  describe('concurrency', () => {
    it('keeps not more than `concurrency` endpoints at once', async () => {
      const concurrency = 7
      let pulled = 0
      let consumed = 0
      let maxInFlight = 0

      function * source (): Generator<TcpExistsEndpoint> {
        for (const port of range(PORT_FROM - 20, PORT_FROM + 20)) {
          ++pulled
          maxInFlight = Math.max(maxInFlight, pulled - consumed)
          yield ['localhost', port]
        }
      }

      for await (const result of tcpExistsMany(source(), {
        concurrency,
        returnOnlyExisted: false
      })) {
        if (result.length === 3) ++consumed
      }

      expect(consumed).toBe(40)
      expect(maxInFlight).toBeLessThanOrEqual(concurrency)
    })
  })

  describe('break', () => {
    it('closes all sockets in flight and the source', async () => {
      const countSockets = (): number =>
        process
          .getActiveResourcesInfo()
          .filter((name) => name === 'TCPSocketWrap').length

      const before = countSockets()
      let sourceClosed = false

      function * source (): Generator<TcpExistsEndpoint> {
        try {
          yield ['localhost', PORT_FROM]
          for (const port of range(BLACKHOLE_PORT, BLACKHOLE_PORT + 100)) {
            yield [BLACKHOLE_HOST, port]
          }
        } finally {
          sourceClosed = true
        }
      }

      const start = performance.now()
      const generator = tcpExistsMany(source(), { timeout: 5000 })
      const { value } = await generator.next()

      expect(value).toEqual(['localhost', PORT_FROM, true])

      await generator.return() // the same as `break` in `for await`
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(performance.now() - start).toBeLessThan(1000)
      expect(countSockets()).toBeLessThanOrEqual(before)
      expect(sourceClosed).toBe(true)
    })
  })

  describe('abort', () => {
    it('stops right after abort and does not yield aborted endpoints', async () => {
      const ac = new AbortController()
      setTimeout(() => ac.abort(), 500)

      const firstGroup = range(PORT_FROM, PORT_FROM + 10)
      const endpoints: TcpExistsEndpoint[] = [
        [BLACKHOLE_HOST, BLACKHOLE_PORT],
        [BLACKHOLE_HOST, BLACKHOLE_PORT + 1],
        ...firstGroup.map((port): TcpExistsEndpoint => ['localhost', port]),
        [BLACKHOLE_HOST, BLACKHOLE_PORT + 2],
        [BLACKHOLE_HOST, BLACKHOLE_PORT + 3],
        ...range(PORT_TO - 10, PORT_TO).map((port): TcpExistsEndpoint => [
          'localhost',
          port
        ])
      ]

      const [results, ms] = await measure(
        collect(endpoints, {
          timeout: 2000,
          concurrency: 3,
          returnOnlyExisted: false,
          signal: ac.signal
        })
      )

      expect(ms).toBe(500)
      expect(results).toEqual(
        firstGroup.map((port) => ['localhost', port, true])
      )
    })

    it('yields nothing for already aborted signal', async () => {
      expect(
        await collect(`localhost:${PORT_FROM}`, { signal: AbortSignal.abort() })
      ).toEqual([])
    })
  })
})
