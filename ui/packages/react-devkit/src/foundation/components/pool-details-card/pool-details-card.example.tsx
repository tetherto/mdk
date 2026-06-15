/**
 * Runnable example for PoolDetailsCard.
 */
import { PoolDetailsCard } from '@tetherto/mdk-react-devkit'

const details = [
  { title: 'URL', value: 'stratum+tcp://eu.example.pool:3333' },
  { title: 'Worker', value: 'rig-01' },
  { title: 'Fee', value: '1.5 %' },
  { title: 'Active workers', value: 42 },
  { title: 'Pool status', value: 'Healthy' },
]

export const PoolDetailsCardExample = () => {
  return <PoolDetailsCard label="Primary pool" details={details} />
}
