import eslint from '@eslint/js'
import eslintReact from '@eslint-react/eslint-plugin'
import { defineConfig } from 'eslint/config'
import { importX } from 'eslint-plugin-import-x'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'packages/svgcanvas',
      '**/build/**/*',
      '**/dist/**/*',
      '**/esm/**/*',
      '**/public/**/*',
      '**/bundle/**/*',
      'pages-dist/**',
      'packages/lib/scripts/**',
      'scripts/**/*.mjs',
      'babel.config.cjs',
      'packages/lib/webpack.config.mjs',
      'packages/lib/vite.config.ts',
      'packages/r-msaview',
      'packages/website',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    settings: {
      react: {
        version: 'v19.2.5',
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  importX.flatConfigs.recommended,
  eslintReact.configs['recommended-typescript'],
  {
    // in main config for TSX/JSX source files
    plugins: {
      'react-refresh': eslintPluginReactRefresh,
    },
    rules: {},
  },
  {
    rules: {
      'no-empty': 'off',
      'no-console': [
        'warn',
        {
          allow: ['error', 'warn'],
        },
      ],
      'no-underscore-dangle': 'off',
      curly: 'error',
      semi: ['error', 'never'],
      'spaced-comment': [
        'error',
        'always',
        {
          markers: ['/'],
        },
      ],

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // not using React Compiler; IIFEs in event handlers are intentional
      '@eslint-react/unsupported-syntax': 'off',
      // most useRef here hold mutable instance values, not DOM/element refs
      '@eslint-react/naming-convention-ref-name': 'off',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],

      'import-x/no-unresolved': 'off',
    },
  },
  {
    files: ['packages/cli/**/*.ts', 'scripts/**/*.ts', 'scripts/release.js'],
    rules: {
      'no-undef': 'off',
      'no-console': 'off',
    },
  },
  {
    rules: {
      'import-x/order': [
        'error',
        {
          named: true,
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
          },
          groups: [
            'builtin',
            ['external', 'internal'],
            ['parent', 'sibling', 'index', 'object'],
            'type',
          ],
          pathGroups: [
            {
              group: 'builtin',
              pattern: 'react',
              position: 'before',
            },
            {
              group: 'external',
              pattern: '@mui/icons-material',
              position: 'after',
            },
          ],

          pathGroupsExcludedImportTypes: ['react'],
        },
      ],
    },
  },
)
