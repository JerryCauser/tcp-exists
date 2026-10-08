/**
 * Usage: npm run bench -- [endpoints] [chunkSize] [timeout]
 * Example: npm run bench -- localhost:1-65535 2300 250
 */
import { tcpExistsMany, DEFAULT_CHUNK_SIZE, DEFAULT_TIMEOUT } from '../index.js'

const [
  endpoints = 'localhost:1-65535',
  chunkSize = DEFAULT_CHUNK_SIZE,
  timeout = DEFAULT_TIMEOUT
] = process.argv.slice(2)

const options = {
  chunkSize: Number(chunkSize),
  timeout: Number(timeout),
  returnOnlyExisted: false
}

console.log(`Scanning ${endpoints}`, options)

let total = 0
const open = []
const start = performance.now()

for await (const chunk of tcpExistsMany(endpoints, options)) {
  total += chunk.length

  for (const [host, port, exist] of chunk) {
    if (exist) open.push(`${host}:${port}`)
  }
}

const seconds = (performance.now() - start) / 1000

console.log(`Scanned:   ${total} endpoints`)
console.log(`Open:      ${open.length} ${open.slice(0, 20).join(' ')}`)
console.log(`Time:      ${seconds.toFixed(2)}s`)
console.log(`Speed:     ${Math.round(total / seconds)} endpoints/s`)
