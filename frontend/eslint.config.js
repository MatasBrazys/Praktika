import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  // ── Bendros taisyklės visiems failams ─────────────────────────────────────
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
    },

    settings: {
      react: { version: 'detect' },
    },

    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern:         '^_',
        varsIgnorePattern:         '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope':           'off',
      'react/prop-types':                   'off',
      'react-hooks/rules-of-hooks':         'error',
      'react-hooks/exhaustive-deps':        'warn',
      'no-console':                         'warn',
      'eqeqeq':                             'error',
      'no-var':                             'error',
      'prefer-const':                       'error',
    },
  },

  // ── SurveyJS utils — išorinė biblioteka be gerų tipų, any leidžiamas ─────
  {
    files: [
      'src/pages/public/Form/utils/**',
      'src/pages/admin/FormBuilder/utils/**',
      'src/components/public/BulkImporter/utils/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    ignores: ['dist/**', 'node_modules/**'],
  },
)