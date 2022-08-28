import { tcpExistsOne, tcpExistsChunk, tcpExistsMany } from '../index.js'
import * as cli from '../src/cli.js'
import _main from './_main.js'

_main({
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany,
  cli
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
