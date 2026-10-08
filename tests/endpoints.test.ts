import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PORTS,
  getEndpoints,
  validateEndpoint
} from '../src/utilities.js'

const defaultPorts = DEFAULT_PORTS.split(',').map(Number)

describe('getEndpoints', () => {
  it('uses default ports for host without ports', () => {
    expect([...getEndpoints(['example.com'])]).toEqual(
      defaultPorts.map((port) => ['example.com', port])
    )
  })

  it('uses passed default ports', () => {
    expect([...getEndpoints('example.com', '22,80')]).toEqual([
      ['example.com', 22],
      ['example.com', 80]
    ])
  })

  it('parses single ports, lists and ranges', () => {
    expect([
      ...getEndpoints(['example.com:8090', 'example2.com:8090-8092'])
    ]).toEqual([
      ['example.com', 8090],
      ['example2.com', 8090],
      ['example2.com', 8091],
      ['example2.com', 8092]
    ])

    expect([...getEndpoints('example.com:80,8000-8001,443')]).toEqual([
      ['example.com', 80],
      ['example.com', 8000],
      ['example.com', 8001],
      ['example.com', 443]
    ])
  })

  it('splits string by `;` and whitespace', () => {
    expect([...getEndpoints('a.com:1; b.com:2 c.com:3')]).toEqual([
      ['a.com', 1],
      ['b.com', 2],
      ['c.com', 3]
    ])
  })

  it('ignores surrounding whitespace', () => {
    expect([...getEndpoints(' example.com:80 ')]).toEqual([['example.com', 80]])
  })

  it('skips empty items instead of stopping', () => {
    expect([...getEndpoints(['a.com:1', '', 'b.com:2'])]).toEqual([
      ['a.com', 1],
      ['b.com', 2]
    ])
  })

  it('ignores empty ports', () => {
    expect([...getEndpoints('example.com:80,')]).toEqual([['example.com', 80]])
  })

  it('uses default ports for `host:`', () => {
    expect([...getEndpoints('example.com:', '22')]).toEqual([
      ['example.com', 22]
    ])
  })

  it('swaps reversed range', () => {
    expect([...getEndpoints('example.com:3-1')]).toEqual([
      ['example.com', 1],
      ['example.com', 2],
      ['example.com', 3]
    ])
  })

  it('lowercases hosts', () => {
    expect([...getEndpoints('Example.COM:80')]).toEqual([['example.com', 80]])
  })

  it('supports IPv6', () => {
    expect([...getEndpoints('[::1]:80,81-82; ::1', '22')]).toEqual([
      ['::1', 80],
      ['::1', 81],
      ['::1', 82],
      ['::1', 22]
    ])
  })

  it('yields ports as numbers', () => {
    for (const [, port] of getEndpoints('example.com:80,8000-8001')) {
      expect(port).toBeTypeOf('number')
    }
  })

  it.each([
    'example.com:0',
    'example.com:65536',
    'example.com:abc',
    'example.com:1-70000',
    'example.com:1-2-3',
    '[::1',
    '[::1]80'
  ])('throws on "%s"', (item) => {
    expect(() => [...getEndpoints(item)]).toThrow(
      expect.objectContaining({
        name: 'RangeError',
        code: 'ERR_INVALID_ENDPOINT'
      })
    )
  })

  it('throws on invalid default ports', () => {
    expect(() => [...getEndpoints('example.com', '22,0')]).toThrow(
      expect.objectContaining({
        name: 'RangeError',
        message: expect.stringContaining('in default ports "22,0"')
      })
    )
  })

  it('throws on the first iteration, before yielding anything', () => {
    const iterator = getEndpoints('a.com:1; b.com:0')

    expect(() => iterator.next()).toThrow(RangeError)
  })
})

describe('validateEndpoint', () => {
  it('returns host and numeric port', () => {
    expect(validateEndpoint(['example.com', '80'])).toEqual(['example.com', 80])
    expect(validateEndpoint(['example.com', 80])).toEqual(['example.com', 80])
  })

  it.each([
    [['example.com', 0]],
    [['example.com', 'abc']],
    [['', 80]],
    [[42, 80]],
    ['example.com:80'],
    [undefined]
  ])('throws on %j', (endpoint) => {
    expect(() => validateEndpoint(endpoint)).toThrow(
      expect.objectContaining({ code: 'ERR_INVALID_ENDPOINT' })
    )
  })
})
