import { DemoPageHeader } from '../../../components/demo-page-header'
import { MinerInfoCard } from '@tetherto/foundation'
import type { ReactElement } from 'react'
import './miner-info-card.demo.scss'

/**
 * MinerInfoCard Demo
 *
 * Interactive demonstration of MinerInfoCard component with various data configurations
 */
export const MinerInfoCardDemo = (): ReactElement => {
  return (
    <div className="miner-info-card-demo">
      <DemoPageHeader
        title="Miner Info Card"
        description="Structured key-value device info display"
      />

      <div className="miner-info-card-demo__examples">
        <div className="miner-info-card-demo__section">
          <h3>Default Label</h3>
          <div className="miner-info-card-demo__grid">
            <MinerInfoCard
              data={[
                { title: 'Model', value: 'Antminer S19 Pro' },
                { title: 'Serial', value: 'SN-00123456' },
                { title: 'Firmware', value: '1.4.2.3' },
                { title: 'IP Address', value: '192.168.1.101' },
              ]}
            />
          </div>
        </div>

        <div className="miner-info-card-demo__section">
          <h3>Custom Label</h3>
          <div className="miner-info-card-demo__grid">
            <MinerInfoCard
              label="Network Info"
              data={[
                { title: 'MAC Address', value: 'AA:BB:CC:DD:EE:FF' },
                { title: 'Gateway', value: '192.168.1.1' },
                { title: 'DNS', value: '192.168.1.1' },
                { title: 'Subnet', value: '255.255.255.0' },
              ]}
            />
          </div>
        </div>
        <div className="miner-info-card-demo__section">
          <h3>Numeric Values</h3>
          <div className="miner-info-card-demo__grid">
            <MinerInfoCard
              label="Performance"
              data={[
                { title: 'Hashrate', value: 110 },
                { title: 'Power Draw', value: 3250 },
                { title: 'Efficiency', value: 29.5 },
                { title: 'Temperature', value: 68 },
              ]}
            />
          </div>
        </div>
        <div className="miner-info-card-demo__section">
          <h3>Array Values</h3>
          <div className="miner-info-card-demo__grid">
            <MinerInfoCard
              label="Pool List"
              data={[
                { title: 'Primary', value: 'stratum+tcp://pool1.example.com:3333' },
                { title: 'Fallback', value: ['pool2.example.com', 'pool3.example.com'] },
                { title: 'Fans', value: ['Fan 1: 4200 RPM', 'Fan 2: 4350 RPM', 'Fan 3: 4100 RPM'] },
              ]}
            />
          </div>
        </div>
        <div className="miner-info-card-demo__section">
          <h3>Mixed &amp; Edge Case Values</h3>
          <div className="miner-info-card-demo__grid">
            <MinerInfoCard
              label="System Info"
              data={[
                { title: 'Status', value: 'active' },
                { title: 'Uptime', value: '5 days 3 hrs' },
                { title: 'Errors', value: 0 },
                { title: 'Description', value: undefined },
                { title: 'Tag', value: null as unknown as string },
              ]}
            />
          </div>
        </div>
        <div className="miner-info-card-demo__section">
          <h3>Empty Array</h3>
          <div className="miner-info-card-demo__grid">
            <MinerInfoCard label="Empty Device" data={[]} />
          </div>
        </div>

        <div className="miner-info-card-demo__section">
          <h3>Single Row</h3>
          <div className="miner-info-card-demo__grid">
            <MinerInfoCard label="Quick Info" data={[{ title: 'Status', value: 'Online' }]} />
          </div>
        </div>
      </div>
    </div>
  )
}
