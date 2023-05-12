import os from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_PORTS,
  DEFAULT_TIMEOUT,
  getEndpoints
} from './utilities.js'

const _dirname =
  typeof __dirname === 'undefined'
    ? new URL('.', import.meta.url).pathname
    : __dirname

const ClosedSymbol = Symbol('closed')

export async function * tcpExistsMany (endpoints, options) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    threads = os.cpus().length,
    timeout = threads < 4 ? DEFAULT_TIMEOUT : DEFAULT_TIMEOUT * 3,
    returnOnlyExisted = true,
    signal
  } = options || {}

  /** @type Worker[] */
  const workers = []

  if (typeof endpoints === 'string') {
    const generator = getEndpoints(endpoints, DEFAULT_PORTS)
    endpoints = []

    for (const item of generator) {
      endpoints.push(item)
    }
  }

  const threadChunkSize = Math.ceil(endpoints.length / threads)

  while (endpoints.length > 0) {
    const chunk = endpoints.splice(0, threadChunkSize)

    workers.push(
      new Worker(path.resolve(_dirname, './_worker.js'), {
        workerData: {
          endpoints: chunk,
          chunkSize,
          timeout,
          returnOnlyExisted
        }
      })
    )
  }

  const results = []
  /** @type Function[] */
  const resolvers = []
  /** @type Promise[] */
  const promises = []

  for (let i = 0; i < workers.length; ++i) {
    workers[i][ClosedSymbol] = false
    promises[i] = new Promise((resolve) => {
      resolvers[i] = resolve
    })

    workers[i]
      .on('error', (err) => {
        throw err
      })
      .on('message', (result) => {
        results.push(...result)
        resolvers[i]()
        promises[i] = new Promise((resolve) => {
          resolvers[i] = resolve
        })
      })
      .on('exit', () => {
        workers[i][ClosedSymbol] = true
        resolvers[i]()
        resolvers[i] = null
        promises[i] = null
      })
  }

  if (signal?.aborted === false) {
    // only if signal existed
    signal.once('abort', () => {
      for (const worker of workers) worker.terminate()
      for (const resolve of resolvers) if (resolve !== null) resolve()
    })
  }

  while (
    workers.some((w) => w[ClosedSymbol] === false) &&
    signal?.aborted !== true
  ) {
    await Promise.race(promises.filter((p) => p !== null))
    yield * results
    results.length = 0
  }

  const terminatePromises = workers.map((w) =>
    w[ClosedSymbol] ? null : w.terminate()
  )

  await Promise.allSettled(terminatePromises)
}
