import {
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany,
  getEndpoints,
  DEFAULT_PORTS
} from 'src/index.js'
import * as cli from '../src/cli.js'
import _main from './_main.js'

console.log('Testing ESM')
_main({
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany,
  getEndpoints,
  DEFAULT_PORTS,
  cli
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
