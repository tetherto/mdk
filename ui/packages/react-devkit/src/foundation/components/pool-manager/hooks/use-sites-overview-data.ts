/**
 * Re-export of the sites-overview projector that now lives in
 * `@tetherto/mdk-react-adapter` (per the separation-of-concerns rule —
 * aggregate-field knowledge and tag predicates belong in the data layer,
 * not the React UI layer).
 *
 * Kept here so existing imports under
 * `pool-manager/hooks/use-sites-overview-data` continue to resolve. New
 * code should import directly from `@tetherto/mdk-react-adapter`.
 */

export type {
  ContainerPoolStat,
  ContainerUnit,
  ProcessedContainerUnit,
  SitesOverviewTailLogItem as TailLogItem,
  UseSitesOverviewDataOptions,
  UseSitesOverviewDataResult,
} from '@tetherto/mdk-react-adapter'
export { useSitesOverviewData } from '@tetherto/mdk-react-adapter'
