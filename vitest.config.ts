import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 10_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/*.test.ts'],
          sequence: { groupOrder: 0 }
        }
      },
      {
        extends: true,
        test: {
          name: 'package',
          include: ['tests/package/*.test.ts'],
          sequence: { groupOrder: 1 }
        }
      },
      {
        extends: true,
        test: {
          name: 'bench',
          include: ['tests/bench/*.test.ts'],
          testTimeout: 60_000,
          sequence: { groupOrder: 2 }
        }
      }
    ]
  }
})
