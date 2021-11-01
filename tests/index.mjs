/* global AbortController */
import net from 'node:net'
import assert from 'node:assert'
import { tcpExistsOne, tcpExistsChunk, tcpExistsMany } from '../index.mjs'

const PORT_FROM = 15400
const PORT_TO = 15500
const servers = []

const serverListener = (socket) => {
  socket.on('error', (e) => console.error(e))
  socket.end()
}

function createTcpServer (port) {
  const server = net.createServer(serverListener)
  server.on('error', (e) => console.error(port, e))
  server.listen(port)

  return server
}

async function prepare () {
  for (let i = PORT_FROM; i < PORT_TO; ++i) {
    servers.push(createTcpServer(i))
  }

  console.log('Servers started')
}

async function testOne () {
  const shouldExists = await tcpExistsOne('localhost', PORT_FROM)
  const shouldNotExists = await tcpExistsOne('localhost', PORT_FROM - 1)

  assert.strictEqual(shouldExists, true, '1. tcpExistsOne should return true')
  assert.strictEqual(
    shouldNotExists,
    false,
    '2. tcpExistsOne should return false'
  )

  console.log('tcpExistsOne tests passed')
}

async function testChunk () {
  const shouldExists = await tcpExistsChunk([
    ['localhost', PORT_FROM - 1],
    ['localhost', PORT_FROM],
    ['localhost', PORT_FROM + 1]
  ])

  const gold = [
    ['localhost', PORT_FROM, true],
    ['localhost', PORT_FROM + 1, true]
  ]

  assert.deepStrictEqual(
    shouldExists,
    gold,
    '3. tcpExistsChunk should be equal to gold'
  )

  console.log('tcpExistsChunk tests passed')
}

async function testMany () {
  const endpointsToCheck = []

  for (let i = PORT_FROM - 50; i < PORT_TO + 50; ++i) {
    endpointsToCheck.push(['localhost', i])
  }

  const gold = []

  for (let i = PORT_FROM; i < PORT_TO; ++i) {
    gold.push(['localhost', i, true])
  }

  const result = []

  const gen = tcpExistsMany(endpointsToCheck, { timeout: 100, chunkSize: 32 })
  for await (const chunk of gen) {
    Array.prototype.push.apply(result, chunk)
  }

  assert.deepStrictEqual(
    result,
    gold,
    '4. tcpExistsMany should be equal to gold'
  )

  console.log('tcpExistsMany tests passed')
}

async function testOneAbort () {
  const ABORT_TIMEOUT = 200
  const ac = new AbortController()
  setTimeout(() => ac.abort(), ABORT_TIMEOUT)

  let time = Date.now()
  const result = await tcpExistsOne(
    '8.8.8.8',
    15000,
    2000,
    ac.signal
  )
  time = Math.round((Date.now() - time) / 100) * 100

  assert.deepStrictEqual(
    [result, time],
    [false, ABORT_TIMEOUT],
    '5. tcpExistsMany should be result as false in 500 ms in case of AbortSignal'
  )
  console.log('tcpExistsOne Abort tests passed')
}

async function testManyAbort () {
  const ABORT_TIMEOUT = 500
  const ac = new AbortController()
  setTimeout(() => ac.abort(), ABORT_TIMEOUT)

  const endpointsToCheck = []
  const gold = []

  endpointsToCheck.push(['8.8.8.8', 15000], ['8.8.8.8', 15001])

  for (let i = PORT_FROM; i < PORT_FROM + 10; ++i) {
    endpointsToCheck.push(['localhost', i])
    gold.push(['localhost', i, true])
  }

  endpointsToCheck.push(['8.8.8.8', 15002], ['8.8.8.8', 15003])

  for (let i = PORT_TO - 10; i < PORT_TO; ++i) {
    endpointsToCheck.push(['localhost', i])
  }

  const result = []

  const gen = tcpExistsMany(endpointsToCheck, { timeout: 200, chunkSize: 1, signal: ac.signal })
  for await (const chunk of gen) {
    Array.prototype.push.apply(result, chunk)
  }

  assert.deepStrictEqual(
    result,
    gold,
    '6. tcpExistsMany Abort should be equal to gold'
  )

  console.log('tcpExistsMany Abort tests passed')
}

async function end () {
  await Promise.all(
    servers.map((server) => new Promise((resolve) => server.close(resolve)))
  )
  console.log('Servers stopped')
}

async function main () {
  await prepare()

  await testOne()
  await testChunk()
  await testMany()
  await testOneAbort()
  await testManyAbort()

  await end()
}

main().then(() => process.exit(0))
