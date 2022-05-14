import { tcpExistsOne, tcpExistsChunk, tcpExistsMany } from '../index.js'
import _main from './_main.js'

_main({
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
