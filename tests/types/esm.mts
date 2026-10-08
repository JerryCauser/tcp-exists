import type {
  TcpExistsEndpoint,
  TcpExistsResult,
  TcpExistsManyOptions
} from 'tcp-exists'

import tcpExists, {
  tcpExistsOne,
  tcpExistsMany,
  getEndpoints,
  DEFAULT_CONCURRENCY,
  DEFAULT_TIMEOUT,
  DEFAULT_PORTS
} from 'tcp-exists'

export const one: Promise<boolean> = tcpExistsOne(
  'localhost',
  80,
  DEFAULT_TIMEOUT
)
export const def: Promise<boolean> = tcpExists('localhost', '80')

export const autoOptions: TcpExistsManyOptions = { timeout: 'auto' }
// @ts-expect-error only number or 'auto'
export const wrongOptions: TcpExistsManyOptions = { timeout: 'fast' }

const options: TcpExistsManyOptions = {
  concurrency: DEFAULT_CONCURRENCY,
  timeout: DEFAULT_TIMEOUT,
  returnOnlyExisted: false,
  signal: new AbortController().signal
}

export async function many (): Promise<TcpExistsResult[]> {
  const result: TcpExistsResult[] = []

  for await (const [host, port, existed] of tcpExistsMany(
    'localhost:1-10',
    options
  )) {
    const h: string = host
    const p: number = port
    const e: boolean = existed
    result.push([h, p, e])
  }

  async function * source (): AsyncGenerator<TcpExistsEndpoint> {
    yield ['localhost', 80]
  }

  for await (const item of tcpExistsMany([['localhost', 80]])) result.push(item)
  for await (const item of tcpExistsMany(getEndpoints('localhost:80'))) {
    result.push(item)
  }
  for await (const item of tcpExistsMany(new Set<TcpExistsEndpoint>())) {
    result.push(item)
  }
  for await (const item of tcpExistsMany(source())) result.push(item)

  return result
}

export const endpoints: Array<[string, number]> = [
  ...getEndpoints('localhost', '22,80')
]
export const ports: string = DEFAULT_PORTS

// @ts-expect-error tcpExistsChunk is removed in v2
export const removed = import('tcp-exists').then((m) => m.tcpExistsChunk)
