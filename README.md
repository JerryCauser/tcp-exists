# tcp-exists
[![npm](https://img.shields.io/npm/v/tcp-exists)](https://www.npmjs.com/package/tcp-exists)
[![tests](https://img.shields.io/github/workflow/status/JerryCauser/tcp-exists/tests?label=tests&logo=github)](https://github.com/JerryCauser/tcp-exists/actions/workflows/tests.yml)
[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/JerryCauser/tcp-exists)](https://lgtm.com/projects/g/JerryCauser/tcp-exists)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![node-current](https://img.shields.io/node/v/tcp-exists)](https://nodejs.org)
[![GitHub](https://img.shields.io/github/license/JerryCauser/tcp-exists)](https://github.com/JerryCauser/tcp-exists/blob/master/LICENSE)

Check if some tcp endpoint (or many) exists. Can be used as a port scanner

- Zero-dependency
- Small — just 3 functions
- Fast — scans `65536` endpoints in `~8sec` (via tcpExistsMany)
- ESM and CJS 

## Install

```bash
npm i tcp-exists --save
```

## Description

### tcpExistsOne(host, port[, timeout[, signal]])
Arguments:
- `host` `<string>`
- `port` `<string> | <number>`
- `timeout` `<number>` - optional number of `ms`. **Default:** `100`
- `signal` `<AbortSignal>` - optional. An AbortSignal that may be used to close a socket and return result ASAP.

Returns:
- `<Promise<boolean>>`

### Usage
```javascript
import { tcpExistsOne } from 'tcp-exists'

const exist = await tcpExistsOne('8.8.8.8', 53, 25)
// check existance of endpoint 8.8.8.8:53 with timeout in 25ms

console.log(exist) // true
```

---


### tcpExistsChunk(endpoints[, options])
It is an async function to check multiple endpoints. If size of endpoints you want to check more than `4096` then recommended to use generator function `tcpExistsMany` or increase `timeout`.

#### Arguments:
- `endpoints` `<[string, string|number][]>` - array of `[host, port]`
- `options` `<object>` - optional
    - `timeout` `<number>` - optional number of `ms` to execute on chunk. Best timeout usually is tenth of the endpoints size plus 10-20ms, but minimum 100ms **Default:** `500`
    - `returnOnlyExisted` `<boolean>` - optional flag to exclude all non-existed results. **Default:** `true`
    - `signal` `<AbortSignal>` - optional. An AbortSignal that may be used to close a sockets and return result ASAP.

#### Returns:
- `<Promise<[string, string|number, boolean][]>>` - will return `array` of `[host, port, existed]`


#### Usage:
```javascript
import { tcpExistsChunk } from 'tcp-exists'

const endpoints = [
  ['8.8.8.8', 53],
  ['8.8.8.8', 80],
  ['8.8.8.8', 443],
  ['8.8.8.8', 8080]
]

const result = await tcpExistsChunk(endpoints)

console.log(result)
// all existed endpoints in format [host, port, existed][]
```

---


### tcpExistsMany(endpoints[, options])
It is an async generator. So you can use it with `for await (... of ...)` or as a stream (check nodejs documentation).

Useful to use with large amount of endpoints.

#### Arguments:
- `endpoints` `<[string, string|number][]>` - array of `[host, port]`
- `options` `<object>` - optional
    - `chunkSize` `<number>` - optional chunk size of endpoints to process at once. **Default:** `1400`
    - `timeout` `<number>` - optional number of `ms` to execute on chunk. Best timeout usually is tenth of the endpoints size plus 10-20ms, but minimum 100ms **Default:** `160`
    - `returnOnlyExisted` `<boolean>` - optional flag to exclude all non-existed results. **Default:** `true`
    - `signal` `<AbortSignal>` - optional. An AbortSignal that may be used to close a sockets, stop iteration and return last chunk result ASAP.

#### Returns:
- `<AsyncIterable<[string, string|number, boolean][]>>` - generator will yield `array` of `[host, port, existed]`


#### Usage
```javascript
import { tcpExistsMany } from 'tcp-exists'

const host = '8.8.8.8'
const endpoints = Array.from({ length: 65535 }).map((_, port) => [host, port + 1]) // every port of 8.8.8.8

const result = []

for await (const existedEndpoints of tcpExistsMany(endpoints)) {
  result.push(...existedEndpoints) 
}

console.log(result)
// all existed endpoints in format [host, port, existed][]
```


## P.S.

There is better alternative of port scanner to use in shell written in rust [RustScan](https://github.com/RustScan/RustScan) (scans 65536 ports in **3s**)

License ([MIT](LICENSE))

