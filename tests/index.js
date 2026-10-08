import {
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany,
  getEndpoints,
  DEFAULT_PORTS
} from '../index.js'
import * as cli from '../src/cli.js'
import { createCachedLookup } from '../src/lookup.js'
import { checkEndpoint } from '../src/one.js'
import _main from './_main.js'

console.log('Testing ESM')
_main({
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany,
  getEndpoints,
  DEFAULT_PORTS,
  cli,
  internals: { createCachedLookup, checkEndpoint }
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
