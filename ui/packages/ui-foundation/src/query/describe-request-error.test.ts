import { describe, expect, it } from 'vitest'

import { MdkFetchError } from '../types/api-mining.types'
import { describeRequestError } from './describe-request-error'

const url = '/apps/ops/status'

describe('describeRequestError', () => {
  it("prefers the app's own ERR_ message", () => {
    const error = new MdkFetchError(400, 'HTTP 400: Bad Request', {
      statusCode: 400,
      message: 'ERR_BAD_RANGE: from is after to',
    })
    expect(describeRequestError(error, url)).toBe('ERR_BAD_RANGE: from is after to')
  })

  it('says nothing serves the route on 404', () => {
    expect(describeRequestError(new MdkFetchError(404, 'HTTP 404: Not Found'), url)).toBe(
      'Nothing serves /apps/ops/status (HTTP 404). The Gateway is up, but no app runtime serves this route.',
    )
  })

  it.each([401, 403])('says the Gateway refused it on %i', (status) => {
    expect(describeRequestError(new MdkFetchError(status, 'x'), url)).toMatch(
      new RegExp(`^The Gateway refused /apps/ops/status \\(HTTP ${status}\\)`),
    )
  })

  it.each([500, 501, 502, 503, 504, 505])(
    'says nothing answered on %i, with the hint when given',
    (status) => {
      const error = new MdkFetchError(status, 'x')
      expect(describeRequestError(error, url)).toBe(
        `/apps/ops/status is not reachable (HTTP ${status}): the Gateway or the app's runtime is not answering.`,
      )
      expect(
        describeRequestError(error, url, { unreachableHint: 'Start the stack with `mdk run`.' }),
      ).toMatch(/answering\. Start the stack with `mdk run`\.$/)
    },
  )

  it("ignores a body message that is not an app's ERR_ code", () => {
    const error = new MdkFetchError(404, 'HTTP 404: Not Found', {
      message: 'Route GET:/x not found',
    })
    expect(describeRequestError(error, url)).toMatch(/^Nothing serves/)
  })

  it('falls back to the error message, or the value itself', () => {
    expect(describeRequestError(new MdkFetchError(418, "HTTP 418: I'm a teapot"), url)).toBe(
      "HTTP 418: I'm a teapot",
    )
    expect(describeRequestError(new TypeError('Failed to fetch'), url)).toBe('Failed to fetch')
    expect(describeRequestError('boom', url)).toBe('boom')
  })
})
