import type * as TcpExists from 'tcp-exists'

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PORT_FROM, startServers } from '../helpers/servers.js'

const BIN = fileURLToPath(new URL('../../dist/bin.js', import.meta.url))

const EXPORTS = [
  'DEFAULT_CONCURRENCY',
  'DEFAULT_PORTS',
  'DEFAULT_TIMEOUT',
  'default',
  'getEndpoints',
  'tcpExistsMany',
  'tcpExistsOne'
]

interface RunResult {
  code: number | null
  stdout: string
  stderr: string
}

interface RunOptions {
  input?: string
  signal?: NodeJS.Signals
  closeStdout?: boolean
}

function run (args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      env: { ...process.env, NO_COLOR: '1' }
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
      if (options.closeStdout === true) child.stdout.destroy()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code, stdout, stderr }))

    if (options.signal !== undefined) {
      const { signal } = options
      setTimeout(() => child.kill(signal), 300)
    }

    child.stdin.end(options.input)
  })
}

let stopServers: () => Promise<void>

beforeAll(async () => {
  stopServers = await startServers(PORT_FROM, PORT_FROM + 2)
})

afterAll(async () => {
  await stopServers()
})

describe.each([
  ['ESM', async () => await import('tcp-exists')],
  ['CJS', async () => createRequire(import.meta.url)('tcp-exists')]
])('%s entry point', (_, load) => {
  it('exports public API only', async () => {
    const module = (await load()) as Record<string, unknown>

    expect(Object.keys(module).sort()).toEqual(EXPORTS)
  })

  it('checks endpoints', async () => {
    const { tcpExistsOne, tcpExistsMany } = (await load()) as typeof TcpExists

    expect(await tcpExistsOne('localhost', PORT_FROM)).toBe(true)

    const results = []
    for await (const result of tcpExistsMany(
      `localhost:${PORT_FROM - 1}-${PORT_FROM}`
    )) {
      results.push(result)
    }

    expect(results).toEqual([['localhost', PORT_FROM, true]])
  })
})

describe('bin', () => {
  it('exits with 0 if something is found', async () => {
    const { code, stdout } = await run([`localhost:${PORT_FROM}`])

    expect(code).toBe(0)
    expect(stdout).toContain(`localhost:${PORT_FROM}\ton`)
  })

  it('exits with 1 if nothing is found', async () => {
    expect((await run([`localhost:${PORT_FROM - 1}`])).code).toBe(1)
  })

  it('exits with 2 on invalid endpoint', async () => {
    const { code, stderr } = await run(['localhost:0'])

    expect(code).toBe(2)
    expect(stderr).toContain('Invalid port "0"')
  })

  it('exits with 2 and prints help without endpoints', async () => {
    const { code, stderr } = await run([])

    expect(code).toBe(2)
    expect(stderr).toContain('Usage')
  })

  it('reads endpoints from stdin', async () => {
    const { code, stdout } = await run([], {
      input: `localhost:${PORT_FROM}\nlocalhost:${PORT_FROM + 1}\n`
    })

    expect(code).toBe(0)
    expect(stdout).toContain(`localhost:${PORT_FROM}\ton`)
    expect(stdout).toContain(`localhost:${PORT_FROM + 1}\ton`)
  })

  it('exits with 130 on SIGINT', async () => {
    const { code } = await run(['-t', '5000', '10.255.255.1:1-1000'], {
      signal: 'SIGINT'
    })

    expect(code).toBe(130)
  })

  it('exits silently when stdout is closed', async () => {
    const { stderr } = await run(['-v', '-t', '100', 'localhost:1-2000'], {
      closeStdout: true
    })

    expect(stderr).toBe('')
  })
})
