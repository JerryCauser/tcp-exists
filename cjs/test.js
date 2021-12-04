const net = require('node:net')
const assert = require('node:assert')
const { tcpExistsMany, tcpExistsChunk, tcpExistsOne } = require('./index.js')

console.log('Testing ')
import('../tests/_main.js')
  .then(async ({ default: _main }) => {
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
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
