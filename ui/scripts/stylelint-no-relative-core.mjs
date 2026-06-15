// Stylelint plugin: ban relative @use paths into src/core in foundation SCSS.
// All foundation stylesheets must use `@use '@core/styles/...' as *;`.
const ruleName = 'custom/no-relative-core-use'
const meta = { url: '' }

const rule = (enabled) => {
  return (root, result) => {
    if (!enabled) return
    root.walkAtRules('use', (atRule) => {
      const match = atRule.params.match(/^['"]([^'"]+)['"]/)
      const path = match?.[1] ?? ''
      if (/^(?:\.\.\/)+core(?:\/|$)/.test(path)) {
        result.warn(`Use '@core/styles/...' instead of relative path "${path}"`, {
          node: atRule,
          ruleName,
          word: path,
        })
      }
    })
  }
}

rule.ruleName = ruleName
rule.meta = meta
rule.messages = {}

export default { ruleName, rule, meta }
