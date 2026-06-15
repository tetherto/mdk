import noRelativeCoreUse from './scripts/stylelint-no-relative-core.mjs'

export default {
  customSyntax: 'postcss-scss',
  plugins: [noRelativeCoreUse],
  rules: {},
  overrides: [
    {
      files: ['packages/react-devkit/src/foundation/**/*.scss'],
      rules: {
        'custom/no-relative-core-use': true,
      },
    },
  ],
}
