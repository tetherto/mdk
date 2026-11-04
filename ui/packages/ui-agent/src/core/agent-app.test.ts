import { describe, expect, it } from 'vitest'

import { AGENT_APP_ID, hasAgentApp } from './agent-app'

describe('hasAgentApp', () => {
  it('finds the agent app by id, whatever it was installed as', () => {
    expect(hasAgentApp([{ id: 'io.tether.demo' }, { id: AGENT_APP_ID }])).toBe(true)
  })

  it('is false without it, or before the app list loads', () => {
    expect(hasAgentApp([{ id: 'io.tether.demo' }])).toBe(false)
    expect(hasAgentApp([])).toBe(false)
    expect(hasAgentApp(undefined)).toBe(false)
  })
})
