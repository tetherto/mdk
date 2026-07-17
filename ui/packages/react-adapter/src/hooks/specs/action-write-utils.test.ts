import { buildRebootAction, buildSetPowerModeAction, POWER_MODE } from '@tetherto/mdk-ui-foundation'
import { describe, expect, it } from 'vitest'

import { extractSubmitError, toVotingPayload } from '../action-write-utils'

describe('toVotingPayload', () => {
  it('keeps the backend-recognised fields and drops client-only ones', () => {
    const payload = toVotingPayload({
      id: 7,
      action: 'registerConfig',
      query: { tags: { $in: ['t-miner'] } },
      params: [{ type: 'pool' }],
      rackType: 'miner',
      codesList: ['WM-M56S-0001'],
      poolName: 'TestPool',
    })

    expect(payload).toEqual({
      action: 'registerConfig',
      query: { tags: { $in: ['t-miner'] } },
      params: [{ type: 'pool' }],
      rackType: 'miner',
    })
  })

  it('carries device-action targeting fields (tags, crossThing) through to the API body', () => {
    const submission = buildSetPowerModeAction(['id-miner-1'], POWER_MODE.SLEEP, {
      type: 'container',
      params: { containers: ['bitdeer-1a'] },
    })

    const payload = toVotingPayload({ id: 1, ...submission })

    expect(payload).toEqual({
      action: 'setPowerMode',
      params: ['sleep'],
      tags: ['id-miner-1'],
      crossThing: { type: 'container', params: { containers: ['bitdeer-1a'] } },
    })
  })

  it('omits tags/crossThing when the staged action has none', () => {
    const payload = toVotingPayload({ id: 2, ...buildRebootAction(['id-miner-2']) })
    expect(payload.tags).toEqual(['id-miner-2'])
    expect('crossThing' in payload).toBe(false)
  })
})

describe('extractSubmitError', () => {
  it('returns null for clean responses', () => {
    expect(extractSubmitError([{ id: 1 }])).toBeNull()
    expect(extractSubmitError([])).toBeNull()
    expect(extractSubmitError(undefined)).toBeNull()
  })

  it('surfaces embedded errors from 200 responses', () => {
    expect(extractSubmitError([{ errors: ['ERR_SOMETHING'] }])).toBe('ERR_SOMETHING')
  })
})
