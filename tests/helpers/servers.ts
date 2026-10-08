import net from 'node:net'

/** ports [PORT_FROM, PORT_TO) are open while servers are started */
export const PORT_FROM = 15400
export const PORT_TO = 15500

export const BLACKHOLE_HOST = '8.8.8.8'
export const BLACKHOLE_PORT = 15000

function listen (port: number): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      socket.on('error', () => {})
      socket.end()
    })

    server.once('error', reject)
    server.listen(port, () => resolve(server))
  })
}

/**
 * Starts TCP servers on every port in [from, to)
 * @returns function which stops all of them
 */
export async function startServers (
  from = PORT_FROM,
  to = PORT_TO
): Promise<() => Promise<void>> {
  const ports = Array.from({ length: to - from }, (_, i) => from + i)
  const servers = await Promise.all(ports.map(listen))

  return async () => {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve()))
      )
    )
  }
}

/** Rounds time to 100ms to compare durations */
export const roundTo100 = (ms: number): number => Math.round(ms / 100) * 100

/** Measures duration of a promise in ms rounded to 100ms */
export async function measure<T> (
  promise: Promise<T>
): Promise<[result: T, ms: number]> {
  const start = performance.now()
  const result = await promise

  return [result, roundTo100(performance.now() - start)]
}
