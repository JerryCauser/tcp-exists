import net from 'node:net'
import assert from 'node:assert'
import { tcpExistsOne, tcpExistsChunk, tcpExistsMany } from '../index.js'
import _main from './_main.js'

_main({
  net,
  assert,
  tcpExistsOne,
  tcpExistsChunk,
  tcpExistsMany
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
