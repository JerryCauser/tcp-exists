import { globalIgnores } from 'eslint/config'
import neostandard from 'neostandard'

export default [
  globalIgnores(['cjs/index.js', 'sandbox/**']),
  ...neostandard({
    ts: true,
    filesTs: ['**/*.mts', '**/*.cts']
  }),
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'never']
    }
  }
]
