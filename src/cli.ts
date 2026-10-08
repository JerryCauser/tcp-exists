import type {
  ErrorWithCode,
  TcpExistsResult,
  TcpExistsTimeout
} from './types.js'

import fs from 'node:fs'
import {
  red,
  green,
  getEndpoints,
  DEFAULT_DELIMITER,
  DEFAULT_PORTS,
  AUTO_TIMEOUT,
  DEFAULT_TIMEOUT,
  MIN_AUTO_TIMEOUT,
  MAX_AUTO_TIMEOUT,
  DEFAULT_CONCURRENCY
} from './utilities.js'
import tcpExistsMany from './many.js'
import { hasCode } from './types.js'

export const EXIT_FOUND = 0
export const EXIT_NOT_FOUND = 1
export const EXIT_USAGE = 2

export interface HelpOptions {
  name: string
  version: string
  description: string
  engines: Record<string, string>
  homepage: string
  license: string
}

export interface ParsedArguments {
  help: boolean
  colorless: boolean
  verbose: boolean
  json: boolean
  ndjson: boolean
  delimiter: string
  concurrency: number
  timeout: TcpExistsTimeout
  ports: string
  endpoints: string[]
}

const packageJSON = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url)).toString()
) as HelpOptions

const usageError = (message: string): ErrorWithCode<Error, 'ERR_USAGE'> =>
  Object.assign(new Error(message), { code: 'ERR_USAGE' as const })

const getHelpText = (packageInfo: HelpOptions, colorless = false): string => {
  const r = colorless ? String : red
  const g = colorless ? String : green

  const name = r(packageInfo.name)
  const { version, description, engines, homepage, license } = packageInfo
  const o = {
    v: r('-v'),
    verbose: r('--verbose'),
    cl: r('-cl'),
    colourless: r('--colourless'),
    colorless: r('--colorless'),
    t: r('-t'),
    timeout: r('--timeout'),
    c: r('-c'),
    concurrency: r('--concurrency'),
    p: r('-p'),
    ports: r('--ports'),
    d: r('-d'),
    delimiter: r('--delimiter'),
    json: r('--json'),
    ndjson: r('--ndjson'),
    h: r('-h'),
    help: r('--help')
  }

  const v = {
    number: g('number'),
    string: g('string'),
    concurrency: g(DEFAULT_CONCURRENCY.toString()),
    auto: g(AUTO_TIMEOUT),
    delimiter: g(DEFAULT_DELIMITER.replace(/\n/gm, '\\n'))
  }

  return `
${name} v${version}
  ${description}


${r('Supported environment')}
  ${Object.entries(engines)
    .map(([k, v]) => k + ': ' + v)
    .join(';\n  ')}


${r('Usage')}
  ${name} ${g('example.com')}
      Will scan DEFAULT_PORTS for given host

  ${name} ${g('example.com')} ${g('example2.com')}
      Will scan DEFAULT_PORTS for all given hosts

  ${name} ${g('example.com:80,443')}
      Will scan 80 and 443 ports for given host

  ${name} ${g('example.com:8000-8999')}
      Will scan [8000...8999] ports for given host

  ${name} ${g('example.com:80,8000-8999,443')}
      Ports declaration can be combined.
      Will scan 80, 443, [8000...8999] ports for given host

  ${name} ${g('[::1]:22,80')}
      IPv6 address must be wrapped in brackets if ports are provided

  cat hosts.txt | ${name} ${o.p} ${g('22,80')}
      Will read endpoints from stdin if no endpoints passed as arguments

  ${name} ${g('example.com:1-65535')} ${o.v} ${o.cl} ${o.t} ${g('300')} ${
    o.c
  } ${g('2000')} ${o.d} ${g("'\\n'")}
      will scan all ports for given host with next options:
       prints all results (${o.v})
       without colors (${o.cl})
       with timeout 300ms (${o.t} ${g('300')})
       with 2000 connections at once (${o.c} ${g('2000')})
       and print each result on new line (${o.d} ${g("'\\n'")})


${r('Arguments')}
  ${o.v}, ${o.verbose}
    By default, ${name} will print only positive results.
    If ${o.v} is passed then it will print all results.

  ${o.cl}, ${o.colourless}, ${o.colorless}
    By default, ${name} uses colored output in TTY mode.
    You can disable it by passing this argument or NO_COLOR environment variable.

  ${o.t}, ${o.timeout} ${v.number}|${v.auto}
    Connection timeout in ms. By default (${
      v.auto
    }) it is estimated for every host
    by measured round-trip times: ${DEFAULT_TIMEOUT}ms until the first answer,
    then from ${MIN_AUTO_TIMEOUT} to ${MAX_AUTO_TIMEOUT}ms. Pass a number to use fixed timeout.

  ${o.c}, ${o.concurrency} ${v.number}
    Changes default max number of connections at once (${v.concurrency}).

  ${o.p}, ${o.ports} ${v.string}
    Ports to scan for hosts without ports. By default, the most popular ports:
    ${g(DEFAULT_PORTS)}

  ${o.d}, ${o.delimiter} ${v.string}
    Changes default delimiter ('${v.delimiter}') between results.

  ${o.json}
    Prints results as JSON array of {"host", "port", "existed"} objects.

  ${o.ndjson}
    Prints every result as JSON object on a separate line.

  ${o.h}, ${o.help}
    Prints help.


${r('Exit codes')}
  0  at least one existed endpoint is found
  1  no existed endpoints are found
  2  invalid arguments or endpoints
  128 + signal number  scan was interrupted (e.g. 130 on Ctrl+C)


${r('Environment')}
  NO_COLOR
    Disables colored output.


${r('Homepage')} ${homepage}
${r('License')} ${license}
`
}

async function readStdin (): Promise<string> {
  let text = ''

  for await (const chunk of process.stdin) text += String(chunk)

  return text
}

const toJSON = ([host, port, existed]: TcpExistsResult): string =>
  JSON.stringify({ host, port, existed })

/**
 * @param args - command line arguments
 * @param ac - aborts the scan
 * @returns exit code
 */
export async function cmd (
  args: string[],
  ac?: AbortController
): Promise<number> {
  let parsed: ParsedArguments

  try {
    parsed = parseArgs(args)
  } catch (error) {
    if (!hasCode(error, 'ERR_USAGE')) throw error

    process.stderr.write(error.message + '\n')

    return EXIT_USAGE
  }

  const {
    help,
    delimiter,
    timeout,
    concurrency,
    ports,
    verbose,
    colorless,
    json,
    ndjson,
    endpoints
  } = parsed

  if (help) {
    process.stdout.write(getHelpText(packageJSON, colorless))

    return EXIT_FOUND
  }

  let input = endpoints.join(';')

  if (input === '' && !process.stdin.isTTY) input = (await readStdin()).trim()

  if (input === '') {
    process.stderr.write(getHelpText(packageJSON, colorless))

    return EXIT_USAGE
  }

  const options = {
    timeout,
    concurrency,
    returnOnlyExisted: !verbose,
    signal: ac?.signal
  }

  let found = 0
  let count = 0

  try {
    for await (const result of tcpExistsMany(
      getEndpoints(input, ports),
      options
    )) {
      if (result[2]) ++found

      if (json) {
        process.stdout.write((count === 0 ? '[\n  ' : ',\n  ') + toJSON(result))
      } else if (ndjson) {
        process.stdout.write(toJSON(result) + '\n')
      } else {
        process.stdout.write(formatOneResult(result, delimiter, colorless))
      }

      ++count
    }
  } catch (error) {
    if (!hasCode(error, 'ERR_INVALID_ENDPOINT')) throw error

    process.stderr.write(error.message + '\n')

    return EXIT_USAGE
  }

  if (json) {
    process.stdout.write(count === 0 ? '[]\n' : '\n]\n')
  } else if (!ndjson) {
    process.stdout.write('\n')
  }

  return found > 0 ? EXIT_FOUND : EXIT_NOT_FOUND
}

/**
 * Splits `--flag=value` into `['--flag', 'value']`.
 * Values are kept as is, even if they are empty or contain `=`
 */
function sanitizeArgs (rawArgs: string[]): string[] {
  const args: string[] = []

  for (const rawArg of rawArgs) {
    const arg = String(rawArg)
    const eqIndex = arg.indexOf('=')

    if (arg.startsWith('-') && eqIndex !== -1) {
      args.push(arg.slice(0, eqIndex), arg.slice(eqIndex + 1))
    } else {
      args.push(arg)
    }
  }

  return args
}

function getDefaultOptions (): ParsedArguments {
  return {
    help: false,
    colorless: false,
    verbose: false,
    json: false,
    ndjson: false,
    delimiter: DEFAULT_DELIMITER,
    concurrency: DEFAULT_CONCURRENCY,
    timeout: AUTO_TIMEOUT,
    ports: DEFAULT_PORTS,
    endpoints: []
  }
}

function parsePositiveInteger (name: string, value: string | undefined): number {
  const number = Number(value)

  if (!/^\d+$/.test(value ?? '') || number <= 0) {
    throw usageError(`${name} must be a positive integer, got "${value ?? ''}"`)
  }

  return number
}

/** Throws Error with code `ERR_USAGE` on invalid arguments */
export function parseArgs (rawArgs: string[]): ParsedArguments {
  const args = sanitizeArgs(rawArgs)

  const options = getDefaultOptions()

  for (let i = 0; i < args.length; ++i) {
    const arg = args[i] as string

    if (arg === '--help' || arg === '-h') {
      options.help = true

      break
    } else if (arg === '-d' || arg === '--delimiter') {
      options.delimiter = parseDelimiter(args[++i])
    } else if (['-cl', '--colourless', '--colorless'].includes(arg)) {
      options.colorless = true
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--ndjson') {
      options.ndjson = true
    } else if (arg === '-t' || arg === '--timeout') {
      const value = args[++i]

      options.timeout =
        value === AUTO_TIMEOUT ? value : parsePositiveInteger(arg, value)
    } else if (['-c', '--concurrency', '-s', '--size'].includes(arg)) {
      options.concurrency = parsePositiveInteger(arg, args[++i])
    } else if (arg === '-p' || arg === '--ports') {
      options.ports = args[++i] ?? ''

      if (options.ports.trim() === '') {
        throw usageError(`${arg} must not be empty`)
      }
    } else if (arg.startsWith('-')) {
      throw usageError(`Unknown option "${arg}". Use --help to see all options`)
    } else if (arg.trim() !== '') {
      options.endpoints.push(arg)
    }
  }

  if (options.json && options.ndjson) {
    throw usageError('--json and --ndjson can not be used together')
  }

  return options
}

function parseDelimiter (delimiter = ''): string {
  if (!delimiter.includes('\\')) return delimiter

  return delimiter
    .replace(/\\t/gm, '\t')
    .replace(/\\v/gm, '\v')
    .replace(/\\f/gm, '\f')
    .replace(/\\n/gm, '\n')
    .replace(/\\r/gm, '\r')
}

export function formatOneResult (
  endpointResult: TcpExistsResult,
  delimiter: string = DEFAULT_DELIMITER,
  colorless = false
): string {
  const [host, port, exist] = endpointResult

  const address = host.includes(':') ? `[${host}]` : host
  const str = `${address}:${port}\t${exist ? 'on' : 'off'}` + delimiter

  if (colorless) return str

  return exist ? green(str) : red(str)
}
