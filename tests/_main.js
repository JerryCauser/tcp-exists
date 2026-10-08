import events from 'node:events'
import net from 'node:net'
import assert from 'node:assert'

async function _main ({
  tcpExistsChunk,
  tcpExistsMany,
  tcpExistsOne,
  getEndpoints,
  DEFAULT_PORTS,
  cli
}) {
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

    const gen = tcpExistsMany(endpointsToCheck, {
      timeout: 100,
      chunkSize: 32
    })
    for await (const chunk of gen) {
      Array.prototype.push.apply(result, chunk)
    }

    assert.deepStrictEqual(
      result,
      gold,
      '4.1 tcpExistsMany ARRAY should be equal to gold'
    )

    const result2 = []
    let chunksCount2 = 0

    const gen2 = tcpExistsMany(`localhost:${PORT_FROM - 50}-${PORT_TO + 50}`, {
      timeout: 100,
      chunkSize: 32
    })
    for await (const chunk of gen2) {
      ++chunksCount2
      Array.prototype.push.apply(result2, chunk)
    }

    assert.deepStrictEqual(
      result2,
      gold,
      '4.2 tcpExistsMany STRING should be equal to gold'
    )

    assert.strictEqual(
      chunksCount2,
      Math.ceil((PORT_TO - PORT_FROM + 100) / 32),
      '4.3 tcpExistsMany STRING should respect chunkSize'
    )

    let chunksCount3 = 0

    const gen3 = tcpExistsMany(`localhost:${PORT_FROM}-${PORT_FROM + 63}`, {
      timeout: 100,
      chunkSize: 32
    })
    for await (const chunk of gen3) {
      ++chunksCount3
      assert.strictEqual(
        chunk.length,
        32,
        '4.4 tcpExistsMany STRING should not yield partial chunks'
      )
    }

    assert.strictEqual(
      chunksCount3,
      2,
      '4.5 tcpExistsMany STRING should not yield extra empty chunk'
    )

    let chunksCount4 = 0

    for await (const _ of tcpExistsMany('')) ++chunksCount4 // eslint-disable-line no-unused-vars

    assert.strictEqual(
      chunksCount4,
      0,
      '4.6 tcpExistsMany STRING should yield nothing for empty input'
    )

    console.log('tcpExistsMany tests passed')
  }

  async function testOneBusyLoop () {
    const result = tcpExistsOne('127.0.0.1', PORT_FROM, 50)
    await new Promise((resolve) => process.nextTick(resolve))
    const blockUntil = Date.now() + 200
    while (Date.now() < blockUntil);

    assert.strictEqual(
      await result,
      true,
      '5.2 answer received during busy event loop should not be lost by timeout'
    )

    console.log('tcpExistsOne Busy Loop tests passed')
  }

  async function testOneAbort () {
    const ABORT_TIMEOUT = 200
    const ac = new AbortController()
    setTimeout(() => ac.abort(), ABORT_TIMEOUT)

    let time = Date.now()
    const result = await tcpExistsOne('8.8.8.8', 15000, 2000, ac.signal)
    time = Math.round((Date.now() - time) / 100) * 100

    assert.deepStrictEqual(
      [result, time],
      [false, ABORT_TIMEOUT],
      '5. tcpExistsMany should be result as false in 500 ms in case of AbortSignal'
    )
    console.log('tcpExistsOne Abort tests passed')
  }

  async function testSignalListeners () {
    const ac = new AbortController()
    const endpoints = []

    for (let i = PORT_FROM - 20; i < PORT_FROM + 20; ++i) {
      endpoints.push(['localhost', i])
    }

    await Promise.all(
      endpoints.map(([host, port]) => tcpExistsOne(host, port, 100, ac.signal))
    )

    for await (const result of tcpExistsMany([...endpoints], {
      signal: ac.signal
    })) {
      assert.ok(result)
    }

    assert.strictEqual(
      events.getEventListeners(ac.signal, 'abort').length,
      0,
      '6.3 finished connections should not keep abort listeners on signal'
    )

    console.log('Signal listeners tests passed')
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

    const gen = tcpExistsMany(endpointsToCheck, {
      timeout: 200,
      chunkSize: 1,
      signal: ac.signal
    })
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

  async function testGetEndpoints () {
    const DEFAULT_PORTS_LIST = DEFAULT_PORTS.split(',')

    const toString = (iterable) => [...iterable].sort().join(';')
    const generateGoldEndpoints = (host, ports) =>
      toString(ports.map((p) => [host, p]))
    const hosts = ['example.com', 'example2.com']
    const ports = [8090, 8091, 8092]

    const endpointsOne = getEndpoints([hosts[0]])

    assert.strictEqual(
      toString(endpointsOne),
      generateGoldEndpoints(hosts[0], DEFAULT_PORTS_LIST),
      '7.1 getEndpoints test 1 host with defaults'
    )

    const endpointsTwo = getEndpoints([
      hosts[0] + ':' + ports[0],
      hosts[1] + ':' + ports[0] + '-' + ports[2]
    ])

    assert.strictEqual(
      toString(endpointsTwo),
      toString(
        [
          generateGoldEndpoints(hosts[0], [ports[0]]),
          generateGoldEndpoints(hosts[1], ports)
        ]
          .join(';')
          .split(';')
          .sort()
      ),
      '7.2 getEndpoints test 2 hosts: first with 1 port, second with 3 ports in range'
    )

    const endpointsComma = getEndpoints(hosts[1] + ':' + ports.join(','))

    assert.strictEqual(
      toString(endpointsComma),
      generateGoldEndpoints(hosts[1], ports),
      '7.3 getEndpoints test 3 ports comma separated'
    )

    assert.strictEqual(
      toString(getEndpoints(` ${hosts[0]}:${ports[0]} `)),
      generateGoldEndpoints(hosts[0], [ports[0]]),
      '7.4 getEndpoints should ignore surrounding whitespace'
    )

    assert.strictEqual(
      toString(
        getEndpoints([`${hosts[0]}:${ports[0]}`, '', `${hosts[1]}:${ports[1]}`])
      ),
      toString([
        [hosts[0], ports[0]],
        [hosts[1], ports[1]]
      ]),
      '7.5 getEndpoints should skip empty items instead of stopping'
    )

    assert.strictEqual(
      toString(getEndpoints(`${hosts[0]}:${ports[0]},`)),
      generateGoldEndpoints(hosts[0], [ports[0]]),
      '7.6 getEndpoints should ignore empty ports'
    )

    console.log('getEndpoints tests passed')
  }

  async function testCLIParser () {
    const { help: helpShort } = cli.parseArgs(['-h'])
    const { help: helpLong } = cli.parseArgs(['--help'])

    assert.strictEqual(helpShort, true, '10.1.1 cli parser -h not parsed')
    assert.strictEqual(helpLong, true, '10.1.2 cli parser --help not parsed')

    const { verbose: verbShort } = cli.parseArgs(['-v'])
    const { verbose: verbLong } = cli.parseArgs(['--verbose'])

    assert.strictEqual(verbShort, true, '10.2.1 cli parser -v not parsed')
    assert.strictEqual(verbLong, true, '10.2.2 cli parser --verbose not parsed')

    const { colorless: clShort } = cli.parseArgs(['-cl'])
    const { colorless: clLong } = cli.parseArgs(['--colorless'])
    const { colorless: clGentle } = cli.parseArgs(['--colourless'])

    assert.strictEqual(clShort, true, '10.3.1 cli parser -cl not parsed')
    assert.strictEqual(clLong, true, '10.3.2 cli parser --colorless not parsed')
    assert.strictEqual(
      clGentle,
      true,
      '10.3.3 cli parser --colourless not parsed'
    )

    const sizes = [~~(Math.random() * 2000), ~~(Math.random() * 2000)]
    const { chunkSize: sizeShort } = cli.parseArgs(['-s', sizes[0].toString()])
    const { chunkSize: sizeLong } = cli.parseArgs([
      '--size',
      sizes[1].toString()
    ])

    assert.strictEqual(sizeShort, sizes[0], '10.4.1 cli parser -s not parsed')
    assert.strictEqual(
      sizeLong,
      sizes[1],
      '10.4.2 cli parser --size not parsed'
    )

    const timeouts = [~~(Math.random() * 2000), ~~(Math.random() * 2000)]
    const { timeout: timeShort } = cli.parseArgs(['-t', timeouts[0].toString()])
    const { timeout: timeLong } = cli.parseArgs([
      '--timeout',
      timeouts[1].toString()
    ])

    const delimiters = [Math.random().toString(), Math.random().toString()]
    assert.strictEqual(
      timeShort,
      timeouts[0],
      '10.5.1 cli parser -t not parsed'
    )
    assert.strictEqual(
      timeLong,
      timeouts[1],
      '10.5.2 cli parser --timeout not parsed'
    )

    const { delimiter: delimShort } = cli.parseArgs(['-d', delimiters[0]])
    const { delimiter: delimLong } = cli.parseArgs([
      '--delimiter',
      delimiters[1]
    ])

    assert.strictEqual(
      delimShort,
      delimiters[0],
      '10.6.1 cli parser -d not parsed'
    )
    assert.strictEqual(
      delimLong,
      delimiters[1],
      '10.6.2 cli parser --delimiter not parsed'
    )

    const toString = (iterable) => [...iterable].sort().join(';')
    const hosts = ['example.com', 'example2.com']
    const ports = [8090, 8091, 8092]

    const argOne = [hosts[0]]
    const { endpoints: endpointsOne } = cli.parseArgs(argOne)

    assert.strictEqual(
      toString(endpointsOne),
      toString(argOne),
      '10.7.1 cli parser test 1 host'
    )

    const argTwo = [
      hosts[0] + ':' + ports[0],
      hosts[1] + ':' + ports[0] + '-' + ports[2]
    ]
    const { endpoints: endpointsTwo } = cli.parseArgs(argTwo)

    assert.strictEqual(
      toString(endpointsTwo),
      toString(argTwo),
      '10.7.2 cli parser test 2 hosts: first with 1 port, second with 3 ports in range'
    )

    const argThree = [hosts[1] + ':' + ports.join(',')]
    const { endpoints: endpointsComma } = cli.parseArgs(argThree)

    assert.strictEqual(
      toString(endpointsComma),
      toString(argThree),
      '10.7.3 cli parser test 3 ports comma separated'
    )

    const emptyDelim = cli.parseArgs(['-d', '', hosts[0]])

    assert.deepStrictEqual(
      [emptyDelim.delimiter, emptyDelim.endpoints],
      ['', [hosts[0]]],
      '10.8.1 cli parser empty value should not consume next argument'
    )

    const eqDelim = cli.parseArgs(['--delimiter==', '--timeout=300', hosts[0]])

    assert.deepStrictEqual(
      [eqDelim.delimiter, eqDelim.timeout, eqDelim.endpoints],
      ['=', 300, [hosts[0]]],
      '10.8.2 cli parser should split only by first "="'
    )

    assert.deepStrictEqual(
      cli.parseArgs(['', ' ']).endpoints,
      [],
      '10.8.3 cli parser should ignore empty endpoints'
    )

    console.log('cli.parser tests passed')
  }

  async function testCLIFormatter () {
    const host = 'example.com'
    const port = '2134'
    const positiveResult = cli.formatOneResult([host, port, true], '', true)
    const negativeResult = cli.formatOneResult(
      [host, parseInt(port, 10), false],
      ';\n',
      true
    )

    assert.strictEqual(
      positiveResult,
      `${host}:${port}\ton`,
      '11.1 cli formatter test positive'
    )

    assert.strictEqual(
      negativeResult,
      `${host}:${port}\toff;\n`,
      '11.2 cli formatter test negative'
    )

    console.log('cli.formatter tests passed')
  }

  async function testCLICmd () {
    const data = []
    process.stdout.originWrite = process.stdout.write
    process.stdout.write = (...args) => {
      data.push(...args)
    }

    try {
      await cli.cmd([
        '-cl',
        '-d',
        '\\n',
        '-t',
        '15',
        `localhost:${PORT_FROM - 1},${PORT_FROM}`
      ]) // should print only positive result

      assert.strictEqual(
        data[0],
        `localhost:${PORT_FROM}\ton\n`,
        '12.1 cli cmd only positive with \\n not correct'
      )

      data.length = 0

      await cli.cmd([
        '-cl',
        '-d',
        '; ',
        '-v',
        '-t',
        '15',
        `localhost:${PORT_FROM - 1}`
      ]) // should print negative result
      assert.strictEqual(
        data[0],
        `localhost:${PORT_FROM - 1}\toff; `,
        '12.2 cli cmd all with delimiter="; " not correct'
      )
    } finally {
      process.stdout.write = process.stdout.originWrite
    }

    console.log('cli.cmd tests passed')
  }

  async function end () {
    await Promise.all(
      servers.map((server) => new Promise((resolve) => server.close(resolve)))
    )
    console.log('Servers stopped')
  }

  await prepare()

  await testOne()
  await testChunk()
  await testGetEndpoints()
  await testMany()
  await testOneAbort()
  await testManyAbort()
  await testSignalListeners()
  await testOneBusyLoop()

  if (cli) {
    await testCLIParser()
    await testCLIFormatter()
    await testCLICmd()
  }

  console.log('All tests are passed')
  await end()
}

export default _main
