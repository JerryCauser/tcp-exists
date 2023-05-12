import { parentPort, workerData } from 'node:worker_threads'
import { tcpExistsMany } from './index.js'

const { endpoints, ...options } = workerData

for await (const chunk of tcpExistsMany(endpoints, options)) {
  parentPort.postMessage(chunk)
}

process.exit(0)
