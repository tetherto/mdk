import { describe, expect, it } from 'vitest'

import { placeholderFor, toPascalCase } from './utils.js'

describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('my-component')).toBe('MyComponent')
  })

  it('converts snake_case to PascalCase', () => {
    expect(toPascalCase('my_component')).toBe('MyComponent')
  })

  it('handles space-separated words', () => {
    expect(toPascalCase('my component name')).toBe('MyComponentName')
  })

  it('leaves already-PascalCase unchanged', () => {
    expect(toPascalCase('MyComponent')).toBe('MyComponent')
  })

  it('handles a single word', () => {
    expect(toPascalCase('dashboard')).toBe('Dashboard')
  })
})

describe('placeholderFor', () => {
  it('returns {false} for boolean type', () => {
    expect(placeholderFor('boolean')).toBe('{false}')
  })

  it('returns {0} for number type', () => {
    expect(placeholderFor('number')).toBe('{0}')
  })

  it('returns {() => {}} for function types with arrow', () => {
    expect(placeholderFor('() => void')).toBe('{() => {}}')
  })

  it('returns {() => {}} for Function type', () => {
    expect(placeholderFor('Function')).toBe('{() => {}}')
  })

  it('returns {[]} for array types with []', () => {
    expect(placeholderFor('string[]')).toBe('{[]}')
  })

  it('returns {[]} for Array<T> types', () => {
    expect(placeholderFor('Array<string>')).toBe('{[]}')
  })

  it('returns {{}} for Record<K,V> types', () => {
    expect(placeholderFor('Record<string, string>')).toBe('{{}}')
  })

  it('returns {{}} for Partial<T> types', () => {
    expect(placeholderFor('Partial<MyType>')).toBe('{{}}')
  })

  it('returns {{}} for inline object types', () => {
    expect(placeholderFor('{foo: string}')).toBe('{{}}')
  })

  it('returns "TODO" for unknown/string types', () => {
    expect(placeholderFor('string')).toBe('"TODO"')
  })

  it('returns "TODO" for custom types', () => {
    expect(placeholderFor('MyCustomType')).toBe('"TODO"')
  })
})
