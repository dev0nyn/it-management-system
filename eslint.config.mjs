import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

export default [
  {
    // Next.js app dirs are linted by `next lint` in apps/web — skip here
    // to avoid missing @next/next plugin references (e.g. no-img-element)
    ignores: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'app/**',
      'components/**',
      'apps/web/**',
      '**/node_modules/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
    },
  },
]
