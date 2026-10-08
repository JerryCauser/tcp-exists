# tcp-exists
[![npm](https://img.shields.io/npm/v/tcp-exists)](https://www.npmjs.com/package/tcp-exists)
[![tests](https://github.com/JerryCauser/tcp-exists/actions/workflows/tests.yml/badge.svg)](https://github.com/JerryCauser/tcp-exists/actions/workflows/tests.yml)
[![CodeQL](https://github.com/JerryCauser/tcp-exists/actions/workflows/codeql.yml/badge.svg)](https://github.com/JerryCauser/tcp-exists/actions/workflows/codeql.yml)
[![CodeFactor Grade](https://img.shields.io/codefactor/grade/github/JerryCauser/tcp-exists/master)](https://www.codefactor.io/repository/github/jerrycauser/tcp-exists)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)
[![node-current](https://img.shields.io/node/v/tcp-exists)](https://nodejs.org)
[![GitHub](https://img.shields.io/github/license/JerryCauser/tcp-exists)](https://github.com/JerryCauser/tcp-exists/blob/master/LICENSE)

Check if some tcp endpoint (or many) exists. Can be used as a port scanner

- Zero-dependency
- Small — two functions and one helper
- Fast — scans `65535` ports of localhost in less than `9sec` (via tcpExistsMany). This contract is checked by tests
- Supports IPv4, IPv6 and hostnames (every hostname is resolved only once per scan)
- ESM and CJS, TypeScript types included

> Scan only hosts you own or have permission to scan.

## CLI Install

```bash
npm i -g tcp-exists
```

## CLI Usage
```bash
tcp-exists --help # print full cli docs 
```
```bash
tcp-exists example.com # scan 20 most popular ports for given host
```
```bash
tcp-exists example.com:22,80,443,8000-10000,27017 # example how to provide list/ranges of ports 
```
```bash
tcp-exists example.com:22 another.org:1-65535 # example how to scan several endpoints 
```
```bash
tcp-exists [::1]:22,80 # IPv6 address must be wrapped in brackets if ports are provided
```
```bash
cat hosts.txt | tcp-exists -p 22,80,443 # read endpoints from stdin, scan given ports for hosts without ports
```
```bash
tcp-exists example.com:1-1024 --ndjson # print every result as JSON on a separate line
```

### CLI options

| Option | Description |
|---|---|
| `-v`, `--verbose` | print all results, not only existed |
| `-t`, `--timeout <number\|auto>` | connection timeout in ms or `auto` to [estimate it by round-trip times][notes-best]. **Default:** `auto` |
| `-c`, `--concurrency <number>` | max connections at once. **Default:** [`DEFAULT_CONCURRENCY`][concurrency] |
| `-p`, `--ports <string>` | ports for hosts without ports, e.g. `22,80,8000-8999`. **Default:** [`DEFAULT_PORTS`][ports] |
| `-d`, `--delimiter <string>` | delimiter between results. **Default:** `\n` |
| `--json` | print results as JSON array of `{ host, port, existed }` |
| `--ndjson` | print every result as JSON object on a separate line |
| `-cl`, `--colorless` | disable colors (`NO_COLOR` environment variable works too) |
| `-h`, `--help` | print help |

### CLI exit codes

| Code | Meaning |
|---|---|
| `0` | at least one existed endpoint is found |
| `1` | no existed endpoints are found |
| `2` | invalid arguments or endpoints |
| `128 + signal` | scan was interrupted, e.g. `130` on Ctrl+C. Second Ctrl+C kills the process immediately |

## Install

```bash
npm i tcp-exists --save
```

## Description

### tcpExistsOne(host, port[, timeout[, signal]])
Arguments:
- `host` `<string>`
- `port` `<string> | <number>`
- `timeout` `<number>` - optional connection timeout in `ms`. If host has both IPv6 and IPv4 addresses, each of them gets its own timeout. **Default:** [`DEFAULT_TIMEOUT`][timeout]
- `signal` `<AbortSignal>` - optional. An AbortSignal that may be used to close a socket and return result ASAP.

Returns:
- `<Promise<boolean>>`

### Usage
```javascript
import { tcpExistsOne } from 'tcp-exists'

const exist = await tcpExistsOne('8.8.8.8', 53, 500)
// check existence of endpoint 8.8.8.8:53 with timeout in 500ms

console.log(exist) // true
```

---

### tcpExistsMany(endpoints[, options])
It is an async generator. So you can use it with `for await (... of ...)` or as a stream (check nodejs documentation).

It keeps at most `concurrency` connections at once and starts a new one as soon as any previous one is finished.
Results are yielded **one by one in order of completion** (not in order of input).

#### Arguments:
- `endpoints` `<string|Iterable<[string, string|number]>|AsyncIterable<[string, string|number]>>` - string in format `host:port,port2; host2; host3:port0-port9; [::1]:port`, or array / any (async) iterable of `[host, port]` (e.g. result of [`getEndpoints`](#getendpointsargument-defaultports)). Passed array is not modified.
- `options` `<object>` - optional
  - `concurrency` `<number>` - optional max number of connections at once. **Default:** [`DEFAULT_CONCURRENCY`][concurrency]
  - `timeout` `<number|'auto'>` - optional connection timeout in `ms` for each endpoint, or `'auto'` to [estimate it for every host by measured round-trip times][notes-best]. **Default:** `'auto'`
  - `returnOnlyExisted` `<boolean>` - optional flag to exclude all non-existed results. **Default:** `true`
  - `signal` `<AbortSignal>` - optional. An AbortSignal that may be used to close all sockets and stop iteration ASAP. Interrupted endpoints are not yielded.

#### Returns:
- `<AsyncGenerator<[host:string, port:number, existed:boolean]>>`

Breaking the loop (`break`, `return` or `throw` inside `for await`) closes all sockets in flight.

#### Throws:
- `TypeError` - if `endpoints` is not a string or an iterable, or `timeout` is neither a positive number nor `'auto'`
- `RangeError` with `code: 'ERR_INVALID_ENDPOINT'` - if some port or endpoint is invalid. For a string it is thrown before any connection is opened

#### Usage
```javascript
import { tcpExistsMany } from 'tcp-exists'

for await (const [host, port] of tcpExistsMany('localhost:1-65535')) {
  console.log(`${host}:${port} exists`)
}
```

Collect all results into an array:
```javascript
const results = await Array.fromAsync(tcpExistsMany([['8.8.8.8', 53], ['8.8.8.8', 443]]))
```

---

### getEndpoints(argument[, defaultPorts])
It is a generator. So you can use it with `for (... of ...)` or destruct into array `[...getEndpoints('example.com:1-65535')]`

#### Arguments:
- `argument` `<string|Iterable<string>>` - string in format `host:port,port2; host2; host3:port0-port9` or array like this `['host1', 'host2:port1,port2', 'host3:port0-port9', '[::1]:port']`
  - IPv6 address must be wrapped in brackets if ports are provided: `[::1]:22,80`. Bare `::1` means default ports
  - Port must be an integer from `1` to `65535`
- `defaultPorts` `<string>` - optional. Ports for hosts without ports, e.g. `22,80,8000-8999`. **Default:** [`DEFAULT_PORTS`][ports]

#### Returns:
- `<Generator<[host:string, port:number]>>`

#### Throws:
- `RangeError` with `code: 'ERR_INVALID_ENDPOINT'` on the first iteration if some port or endpoint is invalid

#### Usage
```javascript
import { getEndpoints, tcpExistsMany } from 'tcp-exists'

const endpoints = getEndpoints(['example.com', 'example.org:8080'], '22,80,443')

for await (const [host, port] of tcpExistsMany(endpoints)) {
  console.log(host, port, 'exists')
}
```

---

### Constants

#### DEFAULT_CONCURRENCY
- `<number>` : `2300`
  
#### DEFAULT_TIMEOUT
- `<number>` : `1000` ms - default timeout of `tcpExistsOne` and initial timeout of `'auto'` mode

#### DEFAULT_PORTS
- `<string>` : `'21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5900,8080'`

---

### Notes

#### Best timeout and concurrency
By default `tcpExistsMany` and CLI use `'auto'` timeout. It works like TCP retransmission timeout ([RFC 6298](https://www.rfc-editor.org/rfc/rfc6298)):
- every answer of a host is a round-trip time sample: open port answers with SYN-ACK, closed one with RST. Timeouts are not samples
- for every host `timeout = srtt + 4 * rttvar`, clamped to `[100, 3000]` ms
- until the first answer of a host [`DEFAULT_TIMEOUT`][timeout] (`1000` ms) is used

So it is short for close hosts and long enough for distant ones without manual tuning.

Pass a fixed number when you know latency to the endpoint: a bit more than latency, but at least `100ms`
(e.g. `350ms` for latency `300ms`). It can be faster than `'auto'` for hosts which drop
all packets to closed ports (no answers → no samples → `1000` ms is used).

Higher `concurrency` gives faster scan, but too many connections at once may be dropped
by your OS, network or a firewall on the other side, which leads to false negative results.
Default value works well in most cases. Check the limit of open files (`ulimit -n`) before increasing it.

#### Benchmark
Performance contract (`65535` ports of localhost in less than `9sec`) is a test in `tests/bench`:
```bash
npm run test:bench
```

To measure speed of a real host use CLI, e.g. `time tcp-exists -c 200 example.com:1-1024`.

---

## Migration from v1 to v2

- Node.js `>=22` is required
- `tcpExistsChunk` is removed. Use `tcpExistsMany`:
  ```javascript
  // v1
  const results = await tcpExistsChunk(endpoints)
  // v2
  const results = await Array.fromAsync(tcpExistsMany(endpoints))
  ```
- `tcpExistsMany` yields results one by one in order of completion instead of arrays (chunks):
  ```javascript
  // v1
  for await (const chunk of tcpExistsMany(endpoints)) {
    for (const [host, port, existed] of chunk) { /* ... */ }
  }
  // v2
  for await (const [host, port, existed] of tcpExistsMany(endpoints)) { /* ... */ }
  ```
- `chunkSize` option is renamed to `concurrency`, `DEFAULT_CHUNK_SIZE` to `DEFAULT_CONCURRENCY`
- port in results of `tcpExistsMany` and `getEndpoints` is always a `number`
- invalid ports in iterable passed to `tcpExistsMany` throw `RangeError` instead of being reported as non-existed
- endpoints interrupted by `signal` are not yielded (in v1 they were reported as non-existed)
- `DEFAULT_PORTS` environment variable is not supported anymore. Use `-p, --ports` in CLI or the second argument of `getEndpoints`
- `timeout` of `tcpExistsMany` and CLI is `'auto'` by default, `DEFAULT_TIMEOUT` is `1000` ms instead of `250` ms; invalid `timeout` throws `TypeError`
- CLI: `-s, --size` is renamed to `-c, --concurrency` (old name still works), exit code is `1` if nothing is found and `2` on invalid arguments, unknown options are not treated as endpoints anymore

---

## Development

The library and tests are written in TypeScript. Sources (`src/`) are compiled to `dist/` (ESM + CJS bundle + type declarations), tests (`tests/`) run with [vitest](https://vitest.dev).

```bash
npm run build      # compile to dist
npm test           # build, typecheck, lint and run all tests except performance contract
npm run test:unit  # tests of sources only, without build
npm run test:bench # performance contract (separate CI step, sensitive to machine load)
npm run fix        # format and fix lint errors
```

Tests:
- `tests/*.test.ts` - sources from `src/`
- `tests/package/` - built package: ESM and CJS entry points, CLI as a process
- `tests/types/` - published type declarations
- `tests/bench/` - performance contract

---

## P.S.

There is better alternative of port scanner to use in shell written in rust [RustScan](https://github.com/RustScan/RustScan) (scans 65536 ports in **3s**)

License ([MIT](LICENSE))

[concurrency]: #DEFAULT_CONCURRENCY
[timeout]: #DEFAULT_TIMEOUT
[ports]: #DEFAULT_PORTS
[notes-best]: #best-timeout-and-concurrency
