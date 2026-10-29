/**
 * The query core: the `QueryClient` factory an MDK app talks to its Gateway
 * with, the base-URL resolution behind it, and the auth-aware fetcher it
 * carries.
 */

/* `SESSION_EXPIRED_STATUS` moved to the `auth` module, which now owns what
 * "the session ended" means. It is reachable from the package root and from
 * `../auth`; re-exporting it here too would make it an ambiguous star export
 * across the two barrels, which ES modules resolve by dropping it silently. */
export {
  API_BASE_URL_ENV,
  createMdkQueryClient,
  type CreateMdkQueryClientOptions,
  DEPRECATED_API_BASE_URL_ENV,
  getApiBaseUrl,
  resolveApiBaseUrl,
} from './client'
export { describeRequestError, type DescribeRequestErrorOptions } from './describe-request-error'
export { mdkFetch } from './mdk-fetch'
export {
  DEFAULT_API_BASE_URL,
  type Fetcher,
  getFetcher,
  getMdkRuntime,
  type MdkRuntime,
} from './runtime'
