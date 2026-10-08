import { globalIgnores } from 'eslint/config'
import neostandard from 'neostandard'

const TS_FILES = ['**/*.ts', '**/*.mts', '**/*.cts']

/**
 * Type imports go first, then one empty line, then code imports:
 *
 *   import type { A } from './a.js'
 *
 *   import b from './b.js'
 */
const typeImportsFirst = {
  meta: {
    type: 'layout',
    messages: {
      order: 'Type imports must go before code imports',
      blankLine:
        'Type imports must be separated from code imports by one empty line'
    }
  },
  create (context) {
    return {
      Program (program) {
        const imports = program.body.filter(
          (node) => node.type === 'ImportDeclaration'
        )
        const firstValue = imports.find((node) => node.importKind !== 'type')
        let lastType

        for (const node of imports) {
          if (node.importKind !== 'type') continue

          if (firstValue && node.range[0] > firstValue.range[0]) {
            context.report({ node, messageId: 'order' })
          } else {
            lastType = node
          }
        }

        if (
          lastType &&
          firstValue &&
          firstValue.loc.start.line - lastType.loc.end.line !== 2
        ) {
          context.report({ node: firstValue, messageId: 'blankLine' })
        }
      }
    }
  }
}

export default [
  globalIgnores(['dist/**', 'sandbox/**']),
  ...neostandard({
    ts: true,
    filesTs: ['**/*.mts', '**/*.cts']
  }),
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'never']
    }
  },
  {
    files: TS_FILES,
    plugins: {
      local: { rules: { 'type-imports-first': typeImportsFirst } }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportSpecifier[importKind="type"]',
          message:
            'Do not mix code and type imports, use a separate `import type` statement'
        }
      ],
      'local/type-imports-first': 'error'
    }
  }
]
