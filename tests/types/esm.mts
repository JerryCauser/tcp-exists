import tcpExists, {
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany,
  getEndpoints,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_TIMEOUT,
  DEFAULT_PORTS
} from 'tcp-exists'

type Result = [string, string | number, boolean]

export const one: Promise<boolean> = tcpExistsOne(
  'localhost',
  80,
  DEFAULT_TIMEOUT
)
export const def: Promise<boolean> = tcpExists('localhost', '80')

export const chunk: Promise<Result[]> = tcpExistsChunk([['localhost', 80]], {
  timeout: 100,
  returnOnlyExisted: false
})

export async function many (): Promise<Result[]> {
  const result: Result[] = []

  for await (const results of tcpExistsMany('localhost:1-10', {
    chunkSize: DEFAULT_CHUNK_SIZE
  })) {
    for (const [host, port, existed] of results) {
      const h: string = host
      const p: string | number = port
      const e: boolean = existed
      result.push([h, p, e])
    }
  }

  return result
}

export async function manyFromIterables (): Promise<Result[]> {
  const result: Result[] = []

  async function * source (): AsyncGenerator<[string, number]> {
    yield ['localhost', 80]
  }

  for await (const chunk of tcpExistsMany(getEndpoints('localhost:80'))) {
    result.push(...chunk)
  }
  for await (const chunk of tcpExistsMany(new Set<[string, number]>())) {
    result.push(...chunk)
  }
  for await (const chunk of tcpExistsMany(source())) result.push(...chunk)

  return result
}

export const endpoints: Array<[string, string | number]> = [
  ...getEndpoints('localhost')
]
export const ports: string = DEFAULT_PORTS
