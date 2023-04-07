#!/usr/bin/env node

import events from 'node:events'
import { cmd } from '../src/cli.js'

const ac = new AbortController()
events.setMaxListeners(0, ac.signal)

cmd(process.argv.slice(2), ac)
  .then((exists) => {
    process.exit(exists === true ? 0 : 1)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

process.on('exit', () => ac.abort())
process.on('SIGINT', () => ac.abort())
process.on('SIGUSR1', () => ac.abort())
process.on('SIGUSR2', () => ac.abort())
process.on('uncaughtException', () => ac.abort())
process.on('SIGTERM', () => ac.abort())
