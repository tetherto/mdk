import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'
import { useMemo } from 'react'

import { useMinerDevices } from './use-miner-devices'
import { useSitesOverview } from './use-sites-overview'

export type UseSiteDetailMinersResult = {
  /** Miners assigned to the container that backs `selectedUnitId`. Empty when no unit is selected. */
  connectedMiners: ListThingsDevice[]
  isLoading: boolean
}

/**
 * Resolves the container that backs `selectedUnitId`, then returns the subset
 * of miner devices assigned to that container. Both underlying queries are
 * already issued by the PoolManager page, so React Query deduplicates them —
 * no extra network cost.
 *
 * @category dashboard
 */
export const useSiteDetailMiners = (selectedUnitId: string | null): UseSiteDetailMinersResult => {
  const { rawUnits } = useSitesOverview()
  const { data: miners, isLoading } = useMinerDevices()

  const selectedContainer = useMemo(() => {
    if (!selectedUnitId) return undefined
    const unit = rawUnits.find((candidate) => candidate.id === selectedUnitId)
    return unit?.info?.container
  }, [selectedUnitId, rawUnits])

  const connectedMiners = useMemo(
    () =>
      selectedContainer
        ? miners.filter((miner) => miner.info?.container === selectedContainer)
        : [],
    [miners, selectedContainer],
  )

  return { connectedMiners, isLoading }
}
