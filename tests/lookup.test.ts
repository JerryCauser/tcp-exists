import type { LookupAddress } from 'node:dns'
import type { LookupFunction } from 'node:net'

import { describe, expect, it } from 'vitest'

import { createCachedLookup } from '../src/lookup.js'

interface LookupResult {
  error: NodeJS.ErrnoException | null
  address: string | LookupAddress[]
  family?: number
}

const call = (
  lookup: LookupFunction,
  host: string,
  options: object
): Promise<LookupResult> =>
  new Promise((resolve) => {
    lookup(host, options, (error, address, family) =>
      resolve({ error, address, family })
    )
  })

describe('createCachedLookup', () => {
  it('returns all addresses', async () => {
    const { address } = await call(createCachedLookup(), 'localhost', {
      all: true
    })

    expect(Array.isArray(address) && address.length > 0).toBe(true)
  })

  it('returns only one address of every family', async () => {
    const { address } = await call(createCachedLookup(), 'localhost', {
      all: true
    })
    const addresses = address as LookupAddress[]

    expect(new Set(addresses.map((a) => a.family)).size).toBe(addresses.length)
  })

  it('filters by family', async () => {
    const { address, family } = await call(createCachedLookup(), 'localhost', {
      family: 4
    })

    expect([address, family]).toEqual(['127.0.0.1', 4])
  })

  it('returns error for unknown host', async () => {
    const { error } = await call(
      createCachedLookup(),
      'not-existed.invalid',
      {}
    )

    expect(error).toBeInstanceOf(Error)
  })

  it('returns the same cached result', async () => {
    const lookup = createCachedLookup()
    const [first, second] = await Promise.all([
      call(lookup, 'localhost', {}),
      call(lookup, 'localhost', {})
    ])

    expect(first).toEqual(second)
  })

  it('counts families of warmed up host', async () => {
    const lookup = createCachedLookup()
    const { address } = await call(lookup, 'localhost', { all: true })

    expect(lookup.getFamiliesCount('localhost')).toBe(1)

    await lookup.warmUp('localhost')

    expect(lookup.getFamiliesCount('localhost')).toBe(address.length)
    expect(lookup.warmUp('localhost')).toBeUndefined()
  })

  it('does not resolve IP addresses', () => {
    const lookup = createCachedLookup()

    expect(lookup.warmUp('127.0.0.1')).toBeUndefined()
    expect(lookup.warmUp('::1')).toBeUndefined()
    expect(lookup.getFamiliesCount('127.0.0.1')).toBe(1)
  })

  it('never rejects warm up', async () => {
    await expect(
      createCachedLookup().warmUp('not-existed.invalid')
    ).resolves.toBeUndefined()
  })
})
