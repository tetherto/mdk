import { MdkFetchError } from '@tetherto/mdk-ui-foundation'
import { describe, expect, it } from 'vitest'

import { toQueryView } from '../query-view'

const url = '/apps/ops/status'

describe('toQueryView', () => {
  it('is loading while the first body is pending', () => {
    expect(
      toQueryView({ isPending: true, isError: false, data: undefined, error: null }, url),
    ).toEqual({
      status: 'loading',
    })
  })

  it('is ready with the data, placeholder data included', () => {
    expect(
      toQueryView({ isPending: false, isError: false, data: { n: 1 }, error: null }, url),
    ).toEqual({
      status: 'ready',
      data: { n: 1 },
    })
  })

  it('describes an error in one line, even with an earlier body cached', () => {
    const error = new MdkFetchError(503, 'HTTP 503: Service Unavailable')
    expect(
      toQueryView({ isPending: false, isError: true, data: { n: 1 }, error }, url, {
        unreachableHint: 'Start the stack with `mdk run`.',
      }),
    ).toEqual({
      status: 'error',
      message:
        "/apps/ops/status is not reachable (HTTP 503): the Gateway or the app's runtime is not answering. Start the stack with `mdk run`.",
    })
  })
})
