import { describe, expect, it } from 'vitest'

import { tcpExistsMany } from 'tcp-exists'

const CONTRACT_SECONDS = 9
const PORTS = 65535

describe('performance contract', () => {
  it(`scans ${PORTS} ports of localhost in less than ${CONTRACT_SECONDS} seconds`, async () => {
    let scanned = 0
    let found = 0
    const start = performance.now()

    for await (const [, , existed] of tcpExistsMany(`localhost:1-${PORTS}`, {
      returnOnlyExisted: false
    })) {
      ++scanned
      if (existed) ++found
    }

    const seconds = (performance.now() - start) / 1000

    console.log(
      `scanned ${scanned} ports in ${seconds.toFixed(2)}s ` +
        `(${Math.round(scanned / seconds)} ports/s), found ${found} open`
    )

    expect(scanned).toBe(PORTS)
    expect(seconds).toBeLessThan(CONTRACT_SECONDS)
  })
})
