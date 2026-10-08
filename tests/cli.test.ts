import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  EXIT_FOUND,
  EXIT_NOT_FOUND,
  EXIT_USAGE,
  cmd,
  formatOneResult,
  parseArgs
} from '../src/cli.js'
import { PORT_FROM, startServers } from './helpers/servers.js'

describe('parseArgs', () => {
  it.each(['-h', '--help'])('parses %s', (flag) => {
    expect(parseArgs([flag]).help).toBe(true)
  })

  it.each(['-v', '--verbose'])('parses %s', (flag) => {
    expect(parseArgs([flag]).verbose).toBe(true)
  })

  it.each(['-cl', '--colorless', '--colourless'])('parses %s', (flag) => {
    expect(parseArgs([flag]).colorless).toBe(true)
  })

  it.each(['-c', '--concurrency', '-s', '--size'])('parses %s', (flag) => {
    expect(parseArgs([flag, '1234']).concurrency).toBe(1234)
  })

  it.each(['-t', '--timeout'])('parses %s', (flag) => {
    expect(parseArgs([flag, '300']).timeout).toBe(300)
    expect(parseArgs([flag, 'auto']).timeout).toBe('auto')
  })

  it('uses auto timeout by default', () => {
    expect(parseArgs([]).timeout).toBe('auto')
  })

  it.each(['-d', '--delimiter'])('parses %s with escapes', (flag) => {
    expect(parseArgs([flag, ';']).delimiter).toBe(';')
    expect(parseArgs([flag, '\\t\\n']).delimiter).toBe('\t\n')
  })

  it.each(['-p', '--ports'])('parses %s', (flag) => {
    expect(parseArgs([flag, '22,80']).ports).toBe('22,80')
  })

  it('parses --json and --ndjson', () => {
    expect(parseArgs(['--json']).json).toBe(true)
    expect(parseArgs(['--ndjson']).ndjson).toBe(true)
  })

  it('collects endpoints', () => {
    const args = ['example.com', 'example.com:8090', 'b.com:8090-8092,22']

    expect(parseArgs(args).endpoints).toEqual(args)
  })

  it('does not consume next argument by empty value', () => {
    const parsed = parseArgs(['-d', '', 'example.com'])

    expect([parsed.delimiter, parsed.endpoints]).toEqual(['', ['example.com']])
  })

  it('splits `--flag=value` only by the first `=`', () => {
    const parsed = parseArgs(['--delimiter==', '--timeout=300', 'example.com'])

    expect([parsed.delimiter, parsed.timeout, parsed.endpoints]).toEqual([
      '=',
      300,
      ['example.com']
    ])
  })

  it('ignores empty endpoints', () => {
    expect(parseArgs(['', ' ']).endpoints).toEqual([])
  })

  it('ignores everything after --help', () => {
    expect(parseArgs(['-h', '--unknown']).help).toBe(true)
  })

  it.each([
    [['-t', 'abc']],
    [['-t', '0']],
    [['-c', '-5']],
    [['-p', '']],
    [['--json', '--ndjson']],
    [['--unknown']]
  ])('throws usage error on %j', (args) => {
    expect(() => parseArgs(args)).toThrow(
      expect.objectContaining({ code: 'ERR_USAGE' })
    )
  })
})

describe('formatOneResult', () => {
  it('formats existed endpoint', () => {
    expect(formatOneResult(['example.com', 2134, true], '', true)).toBe(
      'example.com:2134\ton'
    )
  })

  it('formats non-existed endpoint with delimiter', () => {
    expect(formatOneResult(['example.com', 2134, false], ';\n', true)).toBe(
      'example.com:2134\toff;\n'
    )
  })

  it('wraps IPv6 address in brackets', () => {
    expect(formatOneResult(['::1', 22, true], '', true)).toBe('[::1]:22\ton')
  })
})

describe('cmd', () => {
  let stopServers: () => Promise<void>
  let stdout: string[]
  let stderr: string[]

  beforeAll(async () => {
    stopServers = await startServers(PORT_FROM, PORT_FROM + 2)
  })

  afterAll(async () => {
    await stopServers()
  })

  beforeEach(() => {
    stdout = []
    stderr = []
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdout.push(String(chunk))
      return true
    })
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr.push(String(chunk))
      return true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints only existed endpoints and returns EXIT_FOUND', async () => {
    const code = await cmd([
      '-cl',
      '-d',
      '\\n',
      '-t',
      '15',
      `localhost:${PORT_FROM - 1},${PORT_FROM}`
    ])

    expect([stdout[0], code]).toEqual([
      `localhost:${PORT_FROM}\ton\n`,
      EXIT_FOUND
    ])
  })

  it('prints all results with -v and returns EXIT_NOT_FOUND', async () => {
    const code = await cmd([
      '-cl',
      '-d',
      '; ',
      '-v',
      '-t',
      '15',
      `localhost:${PORT_FROM - 1}`
    ])

    expect([stdout[0], code]).toEqual([
      `localhost:${PORT_FROM - 1}\toff; `,
      EXIT_NOT_FOUND
    ])
  })

  it('prints JSON array with --json', async () => {
    await cmd(['--json', `localhost:${PORT_FROM}`])

    expect(JSON.parse(stdout.join(''))).toEqual([
      { host: 'localhost', port: PORT_FROM, existed: true }
    ])
  })

  it('prints empty JSON array if nothing found', async () => {
    await cmd(['--json', `localhost:${PORT_FROM - 1}`])

    expect(JSON.parse(stdout.join(''))).toEqual([])
  })

  it('prints JSON lines with --ndjson and uses --ports', async () => {
    await cmd(['--ndjson', '-p', `${PORT_FROM},${PORT_FROM + 1}`, 'localhost'])

    const lines = stdout
      .join('')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { port: number })
      .sort((a, b) => a.port - b.port)

    expect(lines).toEqual([
      { host: 'localhost', port: PORT_FROM, existed: true },
      { host: 'localhost', port: PORT_FROM + 1, existed: true }
    ])
  })

  it('returns EXIT_USAGE on invalid endpoint or argument', async () => {
    expect(await cmd(['localhost:0'])).toBe(EXIT_USAGE)
    expect(await cmd(['-t', 'abc', 'localhost'])).toBe(EXIT_USAGE)
    expect(stderr).toHaveLength(2)
  })

  it('prints help and returns EXIT_FOUND with --help', async () => {
    expect(await cmd(['--help', '-cl'])).toBe(EXIT_FOUND)
    expect(stdout.join('')).toContain('Exit codes')
    expect(stdout.join('')).not.toContain('\x1b[')
  })
})
