import type { PoolConfigEntry } from '@tetherto/mdk-ui-foundation'
import { POOL_ENDPOINT_INDEX_ROLES } from '../pool-manager-constants'
import type { PoolEndpoint, PoolSummary } from '../types'

const DEFAULT_POOL_PORT = '80'

/** Structurally identical to `PoolConfigEntry` from `@tetherto/mdk-ui-foundation`. Aliased here so consumers import from `@tetherto/mdk-react-devkit` without reaching into the core layer. */
export type PoolConfigData = PoolConfigEntry

export type UsePoolConfigsResult = {
  pools: PoolSummary[]
  poolIdMap: Record<string, PoolSummary>
  isLoading: boolean
  error: unknown
}

type UsePoolConfigsOptions = {
  data: PoolConfigData[]
  isLoading: boolean
  error: unknown
}

const parseEndpoints = (poolUrls: PoolConfigData['poolUrls']): PoolEndpoint[] =>
  poolUrls.map((endpoint, index) => {
    const { url: poolUrl, pool: poolName } = endpoint

    let url: URL
    try {
      url = new URL(poolUrl)
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid URL')) {
        return { host: '', port: '', pool: poolName, url: poolUrl }
      }
      throw err
    }

    return {
      role: POOL_ENDPOINT_INDEX_ROLES[index as keyof typeof POOL_ENDPOINT_INDEX_ROLES],
      host: url.hostname,
      port: url.port || DEFAULT_POOL_PORT,
      pool: poolName,
      url: poolUrl,
    }
  })

/**
 * Transforms raw pool-configuration rows from the host's API into `PoolSummary` objects for Pool Manager components.
 *
 * @category dashboards
 * @domain mining-operations
 * @kernelCapability hashrate-monitoring
 * @tier agent-ready
 */
export const usePoolConfigs = ({
  data,
  isLoading = false,
  error,
}: Partial<UsePoolConfigsOptions>): UsePoolConfigsResult => {
  const pools: PoolSummary[] = (data ?? []).map((poolConfigData) => {
    const {
      poolConfigName: name,
      description,
      poolUrls,
      id,
      miners,
      containers: units,
      updatedAt: updatedAtTs,
    } = poolConfigData

    return {
      id,
      name,
      description,
      units,
      miners,
      workerName: poolUrls[0]?.workerName,
      workerPassword: poolUrls[0]?.workerPassword,
      endpoints: parseEndpoints(poolUrls),
      updatedAt: new Date(updatedAtTs),
    }
  })

  const poolIdMap = Object.fromEntries(pools.map((pool) => [pool.id, pool]))

  return { pools, poolIdMap, isLoading, error }
}
