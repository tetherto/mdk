import { MdkFetchError } from '../types/api-mining.types'

// The Gateway answered, but nothing serves this route: the app's runtime is not
// running, or the route is not in its plugin/mdk-plugin.json.
const NOT_SERVED = 404
const REFUSED = new Set([401, 403])
// A 5xx: the Gateway or the app's runtime did not answer, or failed (a dev proxy
// reports a stopped Gateway as 500).
const isServerError = (status: number): boolean => status >= 500 && status < 600

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

/** An app's own error code (`ERR_BAD_RANGE: ...`), from the body it answered with. */
const appErrorMessage = (body: unknown): string | null =>
  isRecord(body) && typeof body.message === 'string' && body.message.startsWith('ERR_')
    ? body.message
    : null

export type DescribeRequestErrorOptions = {
  /**
   * Appended when the Gateway or the app's runtime does not answer, e.g.
   * "Start the stack with `mdk run`."
   */
  unreachableHint?: string
}

/**
 * A one-line, operator-facing reason a request to `url` failed. An app's own
 * `ERR_` message wins; otherwise the HTTP status says whether nothing serves
 * the route (404), the Gateway refused it (401/403) or nothing answered (5xx).
 * Any other error gives its own message.
 *
 * @example
 * ```ts
 * describeRequestError(new MdkFetchError(404, 'HTTP 404: Not Found'), '/apps/ops/status')
 * // "Nothing serves /apps/ops/status (HTTP 404). The Gateway is up, but no app runtime serves this route."
 * ```
 *
 * @category api
 */
export const describeRequestError = (
  error: unknown,
  url: string,
  { unreachableHint }: DescribeRequestErrorOptions = {},
): string => {
  if (error instanceof MdkFetchError) {
    const appMessage = appErrorMessage(error.body)
    if (appMessage !== null) return appMessage
    if (error.status === NOT_SERVED) {
      return `Nothing serves ${url} (HTTP 404). The Gateway is up, but no app runtime serves this route.`
    }
    if (REFUSED.has(error.status)) {
      return `The Gateway refused ${url} (HTTP ${error.status}). Sign in again, or check the app's permissions.`
    }
    if (isServerError(error.status)) {
      const reason = `${url} is not reachable (HTTP ${error.status}): the Gateway or the app's runtime is not answering.`
      return unreachableHint === undefined ? reason : `${reason} ${unreachableHint}`
    }
  }
  return error instanceof Error ? error.message : String(error)
}
