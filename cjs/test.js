const {
  tcpExistsMany,
  tcpExistsChunk,
  tcpExistsOne,
  getEndpoints,
  DEFAULT_PORTS
} = require('./index.js')

console.log('Testing CJS')
import('../tests/_main.js')
  .then(async ({ default: _main }) => {
    _main({
      tcpExistsOne,
      tcpExistsChunk,
      tcpExistsMany,
      getEndpoints,
      DEFAULT_PORTS
    }).catch((e) => {
      console.error(e)
      process.exit(1)
    })
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
