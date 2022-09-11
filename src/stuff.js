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

/**
 * @param {string|string[]} argument
 * @param {string} [defaultPorts]
 * @return {Iterator<[host:string, port:string|number]> | void}
 */
export function * getEndpoints (argument, defaultPorts = DEFAULT_PORTS) {
  const defaultPortList = defaultPorts?.split(',') || []

  if (typeof argument === 'string') {
    argument = argument.split(/[;\s]+/)
  }

  for (const item of argument) {
    let [host, ports] = item.split(':')
    host = host?.trim().toLowerCase()
    ports = ports?.trim().toLowerCase().split(',')

    if (!Array.isArray(ports) || ports.length === 0) {
      ports = defaultPortList
    }

    if (!host || ports.length === 0) return

    for (const portChunk of ports) {
      if (portChunk.includes('-')) {
        let [fromPort, toPort] = portChunk.split('-')
        fromPort = Math.max(1, Math.abs(parseInt(fromPort, 10)))
        toPort = Math.min(65535, Math.abs(parseInt(toPort, 10)))

        if (isNaN(fromPort) || isNaN(toPort)) continue

        if (fromPort > toPort) {
          [fromPort, toPort] = [toPort, fromPort]
        }

        for (let p = fromPort; p <= toPort; ++p) {
          yield [host, p]
        }
      } else {
        yield [host, portChunk]
      }
    }
  }
}
