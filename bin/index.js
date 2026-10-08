#!/usr/bin/env node

import events from 'node:events'
import os from 'node:os'
import { cmd } from '../src/cli.js'

const ac = new AbortController()
events.setMaxListeners(0, ac.signal)

const interrupt = (signal) => {
  process.exitCode = 128 + os.constants.signals[signal]
  ac.abort()
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2']) {
  process.once(signal, interrupt)
}

process.stdout.on('error', (error) => {
  ac.abort()

  if (error.code === 'EPIPE') process.exit()

  console.error(error)
  process.exit(1)
})

cmd(process.argv.slice(2), ac).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
