export const DEFAULT_DELIMITER = '\n'
export const DEFAULT_CHUNK_SIZE = 2300
export const DEFAULT_TIMEOUT = 250

const DEFAULT_PORTS_DICT = {
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

export const DEFAULT_PORTS =
  process.env.DEFAULT_PORTS || Object.keys(DEFAULT_PORTS_DICT).join(',')

/**
 * @param {string} str
 * @return {string}
 */
export const red = (str) =>
  process.stdout.isTTY ? `\x1b[31m${str}\x1b[0m` : str
/**
 * @param {string} str
 * @return {string}
 */
export const green = (str) =>
  process.stdout.isTTY ? `\x1b[32m${str}\x1b[0m` : str

export const MIN_PORT = 1
export const MAX_PORT = 65535

/**
 * @param {string} message
 * @return {RangeError}
 */
const invalidEndpointError = (message) => {
  const error = new RangeError(message)
  error.code = 'ERR_INVALID_ENDPOINT'

  return error
}

/**
 * @param {string} value
 * @param {string} item - whole endpoint for error message
 * @return {number}
 */
function parsePort (value, item) {
  const port = Number(value)

  if (!/^\d+$/.test(value) || port < MIN_PORT || port > MAX_PORT) {
    throw invalidEndpointError(
      `Invalid port "${value}" in "${item}". Port must be an integer from ${MIN_PORT} to ${MAX_PORT}`
    )
  }

  return port
}

/**
 * Splits endpoint into host and ports parts.
 * Supports IPv6: `[::1]:80,443` or bare `::1` (default ports)
 * @param {string} item
 * @return {[host:string, ports:string]}
 */
function splitEndpoint (item) {
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

/**
 * @param {string} portsString - like `22,80,8000-8999`
 * @param {string} item - whole endpoint for error message
 * @return {(string|[from:number, to:number])[]} single ports are kept as strings
 */
function parsePorts (portsString, item) {
  const result = []

  for (const portChunk of portsString.split(',')) {
    const chunk = portChunk.trim()

    if (chunk === '') continue

    if (chunk.includes('-')) {
      const [from, to, ...rest] = chunk.split('-').map((p) => p.trim())

      if (rest.length > 0) {
        throw invalidEndpointError(`Invalid port range "${chunk}" in "${item}"`)
      }

      const fromPort = parsePort(from, item)
      const toPort = parsePort(to, item)

      result.push(fromPort > toPort ? [toPort, fromPort] : [fromPort, toPort])
    } else {
      parsePort(chunk, item)
      result.push(chunk)
    }
  }

  return result
}

/**
 * Parses and validates endpoints. Throws RangeError with code `ERR_INVALID_ENDPOINT`
 * on first `next()` call if some port or endpoint is invalid.
 * @param {string|string[]} argument
 * @param {string} [defaultPorts]
 * @return {Generator<[host:string, port:string|number]>}
 */
export function * getEndpoints (argument, defaultPorts = DEFAULT_PORTS) {
  if (typeof argument === 'string') {
    argument = argument.trim().split(/[;\s]+/)
  }

  const parsed = []
  let defaultPortList

  for (const rawItem of argument) {
    const item = String(rawItem).trim().toLowerCase()

    if (item === '') continue

    const [host, portsString] = splitEndpoint(item)

    if (host === '') continue

    let ports = parsePorts(portsString, item)

    if (ports.length === 0) {
      defaultPortList ??= parsePorts(defaultPorts || '', 'DEFAULT_PORTS')
      ports = defaultPortList
    }

    parsed.push([host, ports])
  }

  for (const [host, ports] of parsed) {
    for (const port of ports) {
      if (typeof port === 'string') {
        yield [host, port]

        continue
      }

      for (let p = port[0]; p <= port[1]; ++p) {
        yield [host, p]
      }
    }
  }
}
