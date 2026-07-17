import { EXPLORER_TAB, type ListThingsDevice } from '@tetherto/mdk-ui-foundation'
import { useMemo } from 'react'

import { useExplorerList, type UseExplorerListOptions } from './use-explorer-list'

/** Cabinet devices (powermeters + sensors) grouped under one container. */
export type CabinetGroup = {
  /** Owning container name (`info.container`), or `site` for site-level devices. */
  container: string
  devices: ListThingsDevice[]
}

/** Group key for cabinet devices that carry no container assignment. */
const SITE_GROUP = 'site'

export type UseCabinetGroupsOptions = UseExplorerListOptions

export type UseCabinetGroupsResult = {
  /** Cabinet devices grouped by owning container, site-level group last. */
  groups: CabinetGroup[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches the Explorer cabinet-tab devices (powermeters + temperature
 * sensors) and groups them by their owning container (`info.container`);
 * devices without a container assignment (site-level meters) collect under
 * the `site` group, sorted last.
 *
 * @category op-centre
 */
export const useCabinetGroups = (
  options: UseCabinetGroupsOptions = {},
): UseCabinetGroupsResult => {
  const { things, isLoading, error, refetch } = useExplorerList(EXPLORER_TAB.CABINET, options)

  const groups = useMemo((): CabinetGroup[] => {
    const byContainer = new Map<string, ListThingsDevice[]>()
    for (const device of things) {
      const container =
        typeof device.info?.container === 'string' && device.info.container.length > 0
          ? device.info.container
          : SITE_GROUP
      const bucket = byContainer.get(container)
      if (bucket) {
        bucket.push(device)
      } else {
        byContainer.set(container, [device])
      }
    }

    return [...byContainer.entries()]
      .map(([container, devices]) => ({ container, devices }))
      .sort((a, b) => {
        if (a.container === SITE_GROUP) return 1
        if (b.container === SITE_GROUP) return -1
        return a.container.localeCompare(b.container)
      })
  }, [things])

  return { groups, isLoading, error, refetch }
}
