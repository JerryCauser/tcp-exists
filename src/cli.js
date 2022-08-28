import fs from 'node:fs'
import tcpExistsMany, { DEFAULT_TIMEOUT, DEFAULT_CHUNK_SIZE } from './many.js'

const DEFAULT_DELIMITER = '\n'

const packageJSON = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url)).toString()
)

/**
 * @param {string} str
 * @return {string}
 */
const red = (str) => (process.stdout.isTTY ? `\x1b[31m${str}\x1b[0m` : str)
/**
 * @param {string} str
 * @return {string}
 */
const green = (str) => (process.stdout.isTTY ? `\x1b[32m${str}\x1b[0m` : str)

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
  process.env.DEFAULT_PORT || Object.keys(DEFAULT_PORTS_DICT).join(',')

/**
 *
 * @param {HelpOptions}
 * @return {string}
 */
const getHelpText = ({
  name,
  version,
  description,
  engines,
  homepage,
  license
}) => {
  name = red(name)
  const o = {
    v: red('-v'),
    verbose: red('--verbose'),
    cl: red('-cl'),
    colourless: red('--colourless'),
    colorless: red('--colorless'),
    t: red('-t'),
    timeout: red('--timeout'),
    s: red('-s'),
    size: red('--size'),
    d: red('-d'),
    delimiter: red('--delimiter'),
    h: red('-h'),
    help: red('--help')
  }

  const v = {
    number: green('number'),
    string: green('string'),
    size: green(DEFAULT_CHUNK_SIZE.toString()),
    timeout: green(DEFAULT_TIMEOUT.toString()),
    delimiter: green(DEFAULT_DELIMITER.replace(/\n/gm, '\\n'))
  }

  return `
${name} v${version}
  ${description}


${red('Supported environment')} 
  ${Object.entries(engines)
    .map(([k, v]) => k + ': ' + v)
    .join(';\n  ')}


${red('Usage')}
  ${name} ${green('example.com')}
      Will scan DEFAULT_PORTS for given host
      
  ${name} ${green('example.com')} ${green('example2.com')}
      Will scan DEFAULT_PORTS for all given hosts
    
  ${name} ${green('example.com:80,443')}
      Will scan 80 and 443 ports for given host
    
  ${name} ${green('example.com:8000-8999')}
      Will scan [8000...8999] ports for given host
    
  ${name} ${green('example.com:80,8000-8999,443')}
      Ports declaration can be combined.
      Will scan 80, 443, [8000...8999] ports for given host
    
  ${name} ${green('example.com:1-65535')} ${o.v} ${o.cl} ${o.t} ${green(
    '300'
  )} ${o.s} ${green('2000')} ${o.d} ${green("'\\n'")}
      will scan all ports for given host with next options:
       prints all results (${o.v})
       without colors (${o.cl})
       with timeout 300ms (${o.t} ${green('300')})
       with chunk size 2000 (${o.s} ${green('2000')})
       and print each result on new line (${o.d} ${green("'\\n'")})
      
    
${red('Arguments')}
  ${o.v}, ${o.verbose}
    By default, ${name} will print only positive results.
    If ${o.v} is passed then it will print all results.
    
  ${o.cl}, ${o.colourless}, ${o.colorless}
    By default, ${name} uses colored output in TTY mode.
    You can disable it by by passing this argument.
    
  ${o.t}, ${o.timeout} ${v.number}
    Changes default timeout (${v.timeout} ms) to await if endpoint exists.
    
  ${o.s}, ${o.size} ${v.number}
    Changes default Chunk Size (${v.size}) to scan in one timeout period.
    
  ${o.d}, ${o.delimiter} ${v.string}
    Changes default delimiter ('${v.delimiter}') between results.
    
  ${o.h}, ${o.help}
    Prints help.
    In TTY mode if zero endpoints recognised also will print help.
    
    
${red('Environment')}
  DEFAULT_PORTS ${v.string}
    By default, it is a list of the most popular ports separated by commas.
    ${green(DEFAULT_PORTS)}
    

${red('Homepage')} ${homepage}
${red('License')} ${license}
`
}

/**
 * @param {string[]} args
 * @param {AbortController} ac
 * @return {Promise<void>}
 */
export async function cmd (args, ac) {
  const parsed = parseArgs(args)
  const { help, delimiter, timeout, chunkSize, verbose, colorless, endpoints } =
    parsed

  if (help || (process.stdout.isTTY && endpoints.size === 0)) {
    process.stdout.write(getHelpText(packageJSON))

    return
  }

  const generator = tcpExistsMany([...endpoints], {
    timeout,
    chunkSize,
    returnOnlyExisted: !verbose,
    signal: ac?.signal
  })

  for await (const chunkResult of generator) {
    for (const result of chunkResult) {
      process.stdout.write(formatOneResult(result, delimiter, colorless))
    }
  }
  process.stdout.write('\n')
}

/**
 * @param {string[]} args
 * @return {ParsedArguments}
 */
export function parseArgs (args) {
  args = args
    .map((arg) => arg.toString().split('='))
    .flat(1)
    .filter(Boolean)

  const options = {
    help: false,
    colorless: false,
    verbose: false,
    delimiter: DEFAULT_DELIMITER,
    chunkSize: undefined,
    timeout: undefined,
    endpoints: new Set()
  }

  for (let i = 0; i < args.length; ++i) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true

      break
    } else if (arg === '-d' || arg === '--delimiter') {
      options.delimiter = args[++i] ?? ''

      if (/\\/.test(options.delimiter)) {
        options.delimiter = options.delimiter
          .replace(/\\t/gm, '\t')
          .replace(/\\v/gm, '\v')
          .replace(/\\f/gm, '\f')
          .replace(/\\n/gm, '\n')
          .replace(/\\r/gm, '\r')
      }

      continue
    } else if (
      arg === '-cl' ||
      arg === '--colourless' ||
      arg === '--colorless'
    ) {
      options.colorless = true

      continue
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true

      continue
    } else if (arg === '-t' || arg === '--timeout') {
      options.timeout = parseInt(args[++i], 10)

      if (isNaN(options.timeout)) options.timeout = undefined

      continue
    } else if (arg === '-s' || arg === '--size') {
      options.chunkSize = parseInt(args[++i], 10)

      if (isNaN(options.chunkSize)) options.chunkSize = undefined

      continue
    }

    let [host, ports] = arg.split(':')
    host = host?.trim().toLowerCase()
    ports = ports?.trim().toLowerCase() || DEFAULT_PORTS

    if (!host) continue

    for (const portChunk of ports.split(',')) {
      if (portChunk.includes('-')) {
        let [fromPort, toPort] = portChunk.split('-')
        fromPort = Math.max(1, Math.abs(parseInt(fromPort, 10)))
        toPort = Math.min(65535, Math.abs(parseInt(toPort, 10)))

        if (isNaN(fromPort) || isNaN(toPort)) continue

        if (fromPort > toPort) {
          [fromPort, toPort] = [toPort, fromPort]
        }

        for (let p = fromPort; p <= toPort; ++p) {
          options.endpoints.add([host, p])
        }
      } else {
        options.endpoints.add([host, portChunk])
      }
    }
  }

  return options
}

/**
 * @param {[host:string, port:string|port, exist:boolean]} endpointResult
 * @param {string} [delimiter]
 * @param {boolean} [colorless=false]
 * @return {string}
 */
export function formatOneResult (
  endpointResult,
  delimiter = DEFAULT_DELIMITER,
  colorless = false
) {
  const [host, port, exist] = endpointResult

  let str = `${host}:${port}\t${exist ? 'on' : 'off'}` + delimiter

  if (!colorless) {
    str = exist ? green(str) : red(str)
  }

  return str
}
