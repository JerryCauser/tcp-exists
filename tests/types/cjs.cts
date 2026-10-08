import tcpExists = require('tcp-exists')

const one: Promise<boolean> = tcpExists.tcpExistsOne('localhost', 80)
const ports: string = tcpExists.DEFAULT_PORTS

export = { one, ports }
