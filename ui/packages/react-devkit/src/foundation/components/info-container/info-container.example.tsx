/**
 * Runnable example for InfoContainer and DeviceInfo.
 */
import { DeviceInfo, InfoContainer } from './info-container'

const mockDeviceData = [
  { title: 'MAC Address', value: 'AA:BB:CC:00:00:01' },
  { title: 'IP', value: '10.0.0.11' },
  { title: 'Worker', value: 'rig-01' },
  { title: 'Pool', value: 'pool.example.com:3333' },
  { title: 'Status', value: 'online' },
]

export const InfoContainerExample = () => (
  <div className="mdk-example-row">
    <InfoContainer title="Worker" value="rig-01" />
    <InfoContainer title="Tags" value={['bitcoin', 'sha256', 'liquid-cooled']} />
    <DeviceInfo data={mockDeviceData} />
  </div>
)
