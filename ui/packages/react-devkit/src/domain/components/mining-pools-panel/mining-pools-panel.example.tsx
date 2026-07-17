/**
 * Runnable example for MiningPoolsPanel.
 *
 * Pair with `usePoolRows` from `@tetherto/mdk-react-adapter` in production
 * — the example below uses static rows so it can render outside the
 * MdkProvider.
 */
import { type MiningPoolRow, MiningPoolsPanel } from '@tetherto/mdk-react-devkit'

const rows: MiningPoolRow[] = [
  {
    id: 'f2pool-shelf-0',
    name: 'minerpool-f2pool-shelf-0',
    revenue24hBtc: 0.0231,
    hashratePhs: 0.901,
    details: [
      { title: 'Id', value: 'f2pool-shelf-0' },
      { title: 'Rack', value: 'R-12' },
      { title: 'User name', value: 'operator' },
      { title: 'Balance', value: '0.0214 BTC' },
      { title: 'Unsettled', value: '0.0017 BTC' },
      { title: 'Revenue last 24hrs', value: '0.0231 BTC' },
      { title: 'Active Worker Count', value: 24 },
    ],
  },
  {
    id: 'ocean-shelf-0',
    name: 'minerpool-ocean-shelf-0',
    revenue24hBtc: 0.0142,
    hashratePhs: 1.21,
    details: [
      { title: 'Id', value: 'ocean-shelf-0' },
      { title: 'Rack', value: 'R-04' },
      { title: 'User name', value: 'operator' },
      { title: 'Balance', value: '0.0136 BTC' },
      { title: 'Unsettled', value: '0.0006 BTC' },
      { title: 'Revenue last 24hrs', value: '0.0142 BTC' },
      { title: 'Active Worker Count', value: 18 },
    ],
  },
]

export const MiningPoolsPanelExample = () => <MiningPoolsPanel rows={rows} />
