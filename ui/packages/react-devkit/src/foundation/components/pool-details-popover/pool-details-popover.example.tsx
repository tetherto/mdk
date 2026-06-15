/**
 * Runnable example for PoolDetailsPopover.
 */
import { PoolDetailsPopover } from '@tetherto/mdk-react-devkit'

const details = [
  { title: 'URL', value: 'stratum+tcp://eu.example.pool:3333' },
  { title: 'Worker', value: 'rig-01' },
  { title: 'Fee', value: '1.5 %' },
]

export const PoolDetailsPopoverExample = () => {
  return <PoolDetailsPopover triggerLabel="View pool" title="Pool details" details={details} />
}
