import fs from 'node:fs'
import {
  red,
  green,
  DEFAULT_DELIMITER,
  DEFAULT_PORTS,
  DEFAULT_TIMEOUT,
  DEFAULT_CHUNK_SIZE
} from './utilities.js'
import tcpExistsMany from './many.js'

const packageJSON = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url)).toString()
)

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
    silent: red('--silent'),
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
    
  ${o.silent}
    Suppress output, whether positive or negative.
    
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
  const { help, delimiter, timeout, chunkSize, verbose, silent, colorless, endpoints } =
    parsed

  if (help || (process.stdout.isTTY && endpoints.length === 0)) {
    process.stdout.write(getHelpText(packageJSON))

    return
  }

  const options = {
    timeout,
    returnOnlyExisted: !verbose,
    chunkSize,
    signal: ac?.signal
  }

  let hasResult = false
  for await (const chunkResult of tcpExistsMany(endpoints.join(';'), options)) {
    for (const oneResult of chunkResult) {
      if (!silent) {
        process.stdout.write(formatOneResult(oneResult, delimiter, colorless))
      }
      hasResult = true
    }
  }

  return hasResult
}

/**
 * @param {string[]} rawArgs
 * @returns {string[]}
 */
function sanitizeArgs (rawArgs) {
  return rawArgs
    .map((arg) => arg.toString().split('='))
    .flat(1)
    .filter(Boolean)
}

function getDefaultOptions () {
  return {
    help: false,
    colorless: false,
    verbose: false,
    silent: false,
    delimiter: DEFAULT_DELIMITER,
    chunkSize: DEFAULT_CHUNK_SIZE,
    timeout: DEFAULT_TIMEOUT,
    endpoints: []
  }
}

/**
 * @param {string[]} rawArgs
 * @return {ParsedArguments}
 */
export function parseArgs (rawArgs) {
  const args = sanitizeArgs(rawArgs)

  const options = getDefaultOptions()

  for (let i = 0; i < args.length; ++i) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true

      break
    } else if (arg === '-d' || arg === '--delimiter') {
      options.delimiter = parseDelimiter(args[++i])

      continue
    } else if (['-cl', '--colourless', '--colorless'].includes(arg)) {
      options.colorless = true

      continue
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true

      continue
    } else if (arg === '--silent') {
      options.silent = true

      continue
    } else if (arg === '-t' || arg === '--timeout') {
      options.timeout = parseInt(args[++i], 10)

      if (isNaN(options.timeout)) options.timeout = DEFAULT_TIMEOUT

      continue
    } else if (arg === '-s' || arg === '--size') {
      options.chunkSize = parseInt(args[++i], 10)

      if (isNaN(options.chunkSize)) options.chunkSize = DEFAULT_CHUNK_SIZE

      continue
    }

    options.endpoints.push(arg)
  }

  return options
}

/**
 * @param {string} delimiter
 * @returns {string}
 */
function parseDelimiter (delimiter) {
  delimiter ??= ''

  if (/\\/.test(delimiter)) {
    delimiter = delimiter
      .replace(/\\t/gm, '\t')
      .replace(/\\v/gm, '\v')
      .replace(/\\f/gm, '\f')
      .replace(/\\n/gm, '\n')
      .replace(/\\r/gm, '\r')
  }

  return delimiter
}

/**
 * @param {[host:string, port:(string|number), exist:boolean]} endpointResult
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
