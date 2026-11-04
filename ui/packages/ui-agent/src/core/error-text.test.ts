import { describe, expect, it } from 'vitest'

import {
  describeAgentError,
  ERR_OFFLINE,
  GENERIC_TURN_ERROR,
  isRetryableAgentError,
} from './error-text'
import { ERR_STREAM_IDLE } from './sse'
import { AGENT_ERROR } from './transport'

describe('describeAgentError', () => {
  it('turns a producer code into a sentence', () => {
    // The reducer stores whatever the `error` event carried, which is a bare code.
    expect(describeAgentError(AGENT_ERROR.UNAVAILABLE)).toBe(
      'The agent is not configured on this gateway.',
    )
    expect(describeAgentError(ERR_STREAM_IDLE)).toMatch(/stopped responding/)
  })

  it('generalises a code this release has never seen', () => {
    expect(describeAgentError('ERR_AGENT_SOMETHING_NEW')).toBe(GENERIC_TURN_ERROR)
  })

  it('passes prose through, since the hook already writes some', () => {
    expect(describeAgentError('The agent could not complete that request.')).toBe(
      'The agent could not complete that request.',
    )
  })

  it('has nothing to say about no error', () => {
    expect(describeAgentError(null)).toBeNull()
  })
})

describe('describeAgentError — synthesised status codes', () => {
  it('points at the sign-in when the token was refused', () => {
    expect(describeAgentError('ERR_AGENT_HTTP_401')).toMatch(/session expired/i)
    expect(describeAgentError('ERR_AGENT_HTTP_403')).toMatch(/session expired/i)
  })

  it('reads every 5xx the same way, including ones it has never seen', () => {
    const trouble = describeAgentError('ERR_AGENT_HTTP_500')
    expect(trouble).toMatch(/having trouble right now/)
    expect(describeAgentError('ERR_AGENT_HTTP_502')).toBe(trouble)
    expect(describeAgentError('ERR_AGENT_HTTP_599')).toBe(trouble)
  })

  it('generalises a status it has no specific advice for', () => {
    expect(describeAgentError('ERR_AGENT_HTTP_418')).toBe(GENERIC_TURN_ERROR)
  })

  it('says the request never left the browser', () => {
    expect(describeAgentError(ERR_OFFLINE)).toMatch(/offline/i)
  })
})

describe('isRetryableAgentError', () => {
  it('offers a retry where re-sending could plausibly work', () => {
    expect(isRetryableAgentError(ERR_OFFLINE)).toBe(true)
    expect(isRetryableAgentError(ERR_STREAM_IDLE)).toBe(true)
    expect(isRetryableAgentError('ERR_AGENT_HTTP_502')).toBe(true)
  })

  it('withholds it where the same request would fail identically', () => {
    expect(isRetryableAgentError(AGENT_ERROR.ROUTES_NOT_MOUNTED)).toBe(false)
    expect(isRetryableAgentError(AGENT_ERROR.UNAVAILABLE)).toBe(false)
    expect(isRetryableAgentError('ERR_AGENT_HTTP_401')).toBe(false)
  })

  it('has nothing to retry when the turn did not fail', () => {
    expect(isRetryableAgentError(null)).toBe(false)
  })
})
