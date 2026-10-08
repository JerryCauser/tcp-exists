import type { ErrorWithCode } from './types.js'

export const DEFAULT_DELIMITER = '\n'
export const DEFAULT_CONCURRENCY = 2300
/** fixed timeout of tcpExistsOne and initial timeout of `'auto'` mode, ms */
export const DEFAULT_TIMEOUT = 1000
export const AUTO_TIMEOUT = 'auto'
export const MIN_AUTO_TIMEOUT = 100
export const MAX_AUTO_TIMEOUT = 3000

export const MIN_PORT = 1
export const MAX_PORT = 65535

const DEFAULT_PORTS_DICT: Record<number, string> = {
  21: 'ftp',
  22: 'ssh',
  23: 'telnet',
  25: 'smtp',
  53: 'domain name system',
  80: 'http',
  110: 'pop3',
  111: 'rpcbind',
  135: 'msrpc',
  139: 'netbios-ssn',
  143: 'imap',
  443: 'https',
  445: 'microsoft-ds',
  993: 'imaps',
  995: 'pop3s',
  1723: 'pptp',
  3306: 'mysql',
  3389: 'ms-wbt-server',
  5900: 'vnc',
  8080: 'http-proxy'
}

/** the most popular ports, used for hosts without ports */
export const DEFAULT_PORTS = Object.keys(DEFAULT_PORTS_DICT).join(',')

export const isColorEnabled = (): boolean =>
  process.stdout.isTTY && !process.env.NO_COLOR

export const red = (str: string): string =>
  isColorEnabled() ? `\x1b[31m${str}\x1b[0m` : str

export const green = (str: string): string =>
  isColorEnabled() ? `\x1b[32m${str}\x1b[0m` : str

type PortRange = [from: number, to: number]

export type InvalidEndpointError = ErrorWithCode<
  RangeError,
  'ERR_INVALID_ENDPOINT'
>

const invalidEndpointError = (message: string): InvalidEndpointError =>
  Object.assign(new RangeError(message), {
    code: 'ERR_INVALID_ENDPOINT' as const
  })

function parsePort (value: unknown, where: string): number {
  const port = Number(value)

  if (
    !/^\d+$/.test(String(value).trim()) ||
    port < MIN_PORT ||
    port > MAX_PORT
  ) {
    throw invalidEndpointError(
      `Invalid port "${String(
        value
      )}" in ${where}. Port must be an integer from ${MIN_PORT} to ${MAX_PORT}`
    )
  }

  return port
}

/**
 * Splits endpoint into host and ports parts.
 * Supports IPv6: `[::1]:80,443` or bare `::1` (default ports)
 */
function splitEndpoint (item: string): [host: string, ports: string] {
  if (item.startsWith('[')) {
    const end = item.indexOf(']')
    const rest = item.slice(end + 1)

    if (end === -1 || (rest !== '' && !rest.startsWith(':'))) {
      throw invalidEndpointError(
        `Invalid endpoint "${item}". Expected format for IPv6 is [host]:ports`
      )
    }

    return [item.slice(1, end), rest.slice(1)]
  }

  const firstColon = item.indexOf(':')

  if (firstColon === -1 || item.indexOf(':', firstColon + 1) !== -1) {
    return [item, '']
  }

  return [item.slice(0, firstColon), item.slice(firstColon + 1)]
}

function parsePorts (portsString: string, where: string): PortRange[] {
  const result: PortRange[] = []

  for (const portChunk of portsString.split(',')) {
    const chunk = portChunk.trim()

    if (chunk === '') continue

    if (chunk.includes('-')) {
      const [from, to, ...rest] = chunk.split('-').map((p) => p.trim())

      if (rest.length > 0) {
        throw invalidEndpointError(`Invalid port range "${chunk}" in ${where}`)
      }

      const fromPort = parsePort(from, where)
      const toPort = parsePort(to, where)

      result.push(fromPort > toPort ? [toPort, fromPort] : [fromPort, toPort])
    } else {
      const port = parsePort(chunk, where)
      result.push([port, port])
    }
  }

  return result
}

/**
 * Parses and validates endpoints like `host:port,port2; host2; host3:port0-port9; [::1]:port`.
 * Throws RangeError with code `ERR_INVALID_ENDPOINT`
 * on the first iteration if some port or endpoint is invalid.
 * @param argument - string or list of endpoints
 * @param defaultPorts - ports for hosts without ports, like `22,80,8000-8999`
 */
export function * getEndpoints (
  argument: string | Iterable<string>,
  defaultPorts: string = DEFAULT_PORTS
): Generator<[host: string, port: number], void, undefined> {
  const items =
    typeof argument === 'string' ? argument.trim().split(/[;\s]+/) : argument

  const parsed: Array<[host: string, ports: PortRange[]]> = []
  let defaultPortList: PortRange[] | undefined

  for (const rawItem of items) {
    const item = String(rawItem).trim().toLowerCase()

    if (item === '') continue

    const [host, portsString] = splitEndpoint(item)

    if (host === '') continue

    let ports = parsePorts(portsString, `"${item}"`)

    if (ports.length === 0) {
      defaultPortList ??= parsePorts(
        defaultPorts,
        `default ports "${defaultPorts}"`
      )
      ports = defaultPortList
    }

    parsed.push([host, ports])
  }

  for (const [host, ports] of parsed) {
    for (const [fromPort, toPort] of ports) {
      for (let port = fromPort; port <= toPort; ++port) {
        yield [host, port]
      }
    }
  }
}

/**
 * Validates endpoint passed as [host, port] pair.
 * Throws RangeError with code `ERR_INVALID_ENDPOINT` if it is invalid
 */
export function validateEndpoint (
  endpoint: unknown
): [host: string, port: number] {
  const [host, port]: unknown[] = Array.isArray(endpoint) ? endpoint : []
  const item = Array.isArray(endpoint)
    ? `${String(host)}:${String(port)}`
    : String(endpoint)

  if (typeof host !== 'string' || host.trim() === '') {
    throw invalidEndpointError(
      `Invalid endpoint "${item}". Expected [host: string, port: number]`
    )
  }

  return [host, parsePort(port, `"${item}"`)]
}
