import tcpExists = require('tcp-exists')

const one: Promise<boolean> = tcpExists.tcpExistsOne('localhost', 80)
const ports: string = tcpExists.DEFAULT_PORTS
const many: AsyncGenerator<[string, number, boolean]> =
  tcpExists.tcpExistsMany('localhost')

export = { one, ports, many }
