import tty from 'node:tty'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { green, isColorEnabled, red } from '../src/utilities.js'

const stdout = process.stdout as tty.WriteStream
const original = {
  isTTY: stdout.isTTY,
  hasColors: stdout.hasColors,
  env: { ...process.env }
}

function setTTY (isTTY: boolean): void {
  stdout.isTTY = isTTY
  stdout.hasColors = tty.WriteStream.prototype.hasColors
}

describe('isColorEnabled', () => {
  beforeEach(() => {
    delete process.env.NO_COLOR
    delete process.env.FORCE_COLOR
    delete process.env.NODE_DISABLE_COLORS
    process.env.TERM = 'xterm-256color'
  })

  afterEach(() => {
    stdout.isTTY = original.isTTY
    stdout.hasColors = original.hasColors
    process.env = { ...original.env }
  })

  it('is enabled in color terminal', () => {
    setTTY(true)

    expect(isColorEnabled()).toBe(true)
    expect(red('a')).toBe('\x1b[31ma\x1b[0m')
    expect(green('a')).toBe('\x1b[32ma\x1b[0m')
  })

  it('is disabled without TTY', () => {
    setTTY(false)
    process.env.FORCE_COLOR = '1'

    expect(isColorEnabled()).toBe(false)
    expect(red('a')).toBe('a')
  })

  it.each(['NO_COLOR', 'NODE_DISABLE_COLORS'])('is disabled by %s', (name) => {
    setTTY(true)
    process.env[name] = '1'

    expect(isColorEnabled()).toBe(false)
  })

  it('is disabled for dumb terminal', () => {
    setTTY(true)
    process.env.TERM = 'dumb'

    expect(isColorEnabled()).toBe(false)
  })
})
