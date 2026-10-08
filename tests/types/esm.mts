import tcpExists, {
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany,
  getEndpoints,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_TIMEOUT,
  DEFAULT_PORTS
} from 'tcp-exists'

export const one: Promise<boolean> = tcpExistsOne(
  'localhost',
  80,
  DEFAULT_TIMEOUT
)
export const def: Promise<boolean> = tcpExists('localhost', '80')

export const chunk: Promise<[string, string | number, boolean][]> =
  tcpExistsChunk([['localhost', 80]], {
    timeout: 100,
    returnOnlyExisted: false
  })

export async function many (): Promise<
  Array<[string, string | number, boolean]>
> {
  const result: Array<[string, string | number, boolean]> = []

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

export const endpoints: [string, string | number][] = [
  ...getEndpoints('localhost')
]
export const ports: string = DEFAULT_PORTS
