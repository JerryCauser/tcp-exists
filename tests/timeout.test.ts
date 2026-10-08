import { describe, expect, it } from 'vitest'

import { createTimeoutEstimator, validateTimeout } from '../src/timeout.js'
import {
  DEFAULT_TIMEOUT,
  MAX_AUTO_TIMEOUT,
  MIN_AUTO_TIMEOUT
} from '../src/utilities.js'

describe('createTimeoutEstimator', () => {
  it('starts with DEFAULT_TIMEOUT', () => {
    expect(createTimeoutEstimator().get('a')).toBe(DEFAULT_TIMEOUT)
  })

  it('uses `rtt + 4 * rtt / 2` after the first sample', () => {
    const estimator = createTimeoutEstimator()
    estimator.update('a', 50)

    expect(estimator.get('a')).toBe(150)
  })

  it('converges and is clamped by MIN_AUTO_TIMEOUT', () => {
    const estimator = createTimeoutEstimator()

    for (let i = 0; i < 100; ++i) estimator.update('a', 50)

    expect(estimator.get('a')).toBe(MIN_AUTO_TIMEOUT)
  })

  it('keeps timeout above rtt with jitter', () => {
    const estimator = createTimeoutEstimator()
    estimator.update('a', 400)
    estimator.update('a', 600)

    expect(estimator.get('a')).toBeGreaterThan(600)
  })

  it('is clamped by MAX_AUTO_TIMEOUT', () => {
    const estimator = createTimeoutEstimator()
    estimator.update('a', 10_000)

    expect(estimator.get('a')).toBe(MAX_AUTO_TIMEOUT)
  })

  it('keeps hosts independent', () => {
    const estimator = createTimeoutEstimator()
    estimator.update('a', 50)

    expect(estimator.get('b')).toBe(DEFAULT_TIMEOUT)
  })
})

describe('validateTimeout', () => {
  it.each([1, 250, 0.5, 'auto'])('accepts %j', (timeout) => {
    expect(validateTimeout(timeout)).toBe(timeout)
  })

  it.each([0, -1, '100', 'fast', NaN, Infinity, null, undefined])(
    'throws TypeError on %j',
    (timeout) => {
      expect(() => validateTimeout(timeout)).toThrow(TypeError)
    }
  )
})
