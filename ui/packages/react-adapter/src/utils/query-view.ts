import type { UseQueryResult } from '@tanstack/react-query'
import { describeRequestError, type DescribeRequestErrorOptions } from '@tetherto/mdk-ui-foundation'

/**
 * What a data hook hands a component: never raw query state. A component
 * switches on `status` and renders loading, the error line, or the data.
 *
 * @category data
 */
export type QueryView<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

/**
 * A query's state as a {@link QueryView}. An error becomes one operator-facing
 * line ({@link describeRequestError} for `url`), even when an earlier body is
 * still cached; placeholder data (`placeholderData`) counts as ready, so the
 * last body stays on screen while the next one loads.
 *
 * @example
 * ```ts
 * const query = useQuery({ queryKey: ['status', url], queryFn: () => fetchStatus(url) })
 * return toQueryView(query, url, { unreachableHint: 'Start the stack with `mdk run`.' })
 * ```
 *
 * @category data
 */
export const toQueryView = <T>(
  query: Pick<UseQueryResult<T>, 'data' | 'error' | 'isError' | 'isPending'>,
  url: string,
  options?: DescribeRequestErrorOptions,
): QueryView<T> => {
  if (query.isError) {
    return { status: 'error', message: describeRequestError(query.error, url, options) }
  }
  if (query.isPending) return { status: 'loading' }
  return { status: 'ready', data: query.data as T }
}
