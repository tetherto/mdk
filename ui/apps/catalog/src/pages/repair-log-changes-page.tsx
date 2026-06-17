import type { RepairBatchAction, RepairDevice } from '@tetherto/mdk-react-devkit/foundation'
import { RepairLogChangesSubRow } from '@tetherto/mdk-react-devkit/foundation'

import type { JSX } from 'react'

import './repair-log-changes-page.scss'

const sampleBatchAction: RepairBatchAction = {
  params: [
    {
      params: [
        {
          id: 'inventory-miner_part-hashboard-001',
          rackId: 'inventory-miner_part-hashboard',
          info: { parentDeviceId: null },
        },
      ],
    },
    {
      params: [
        {
          id: 'inventory-miner_part-psu-002',
          rackId: 'inventory-miner_part-psu',
          info: { parentDeviceId: 'antminer-s21-001' },
        },
      ],
    },
    {
      params: [
        {
          id: 'inventory-miner_part-controller-003',
          rackId: 'inventory-miner_part-controller',
          info: { parentDeviceId: null },
        },
      ],
    },
  ],
}

const sampleDevices: RepairDevice[] = [
  {
    id: 'inventory-miner_part-hashboard-001',
    rack: 'inventory-miner_part-hashboard',
    info: { serialNum: 'HB-SN-0001', macAddress: 'AA:BB:CC:00:00:01' },
  },
  {
    id: 'inventory-miner_part-psu-002',
    rack: 'inventory-miner_part-psu',
    info: { serialNum: 'PSU-SN-0002', macAddress: 'AA:BB:CC:00:00:02' },
  },
  {
    id: 'inventory-miner_part-controller-003',
    rack: 'inventory-miner_part-controller',
    info: { serialNum: 'CB-SN-0003', macAddress: 'AA:BB:CC:00:00:03' },
  },
]

export const RepairLogChangesPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Repair Log Changes</h2>

      <div className="repair-log-changes-page__blocks">
        <div>
          <h3>RepairLogChangesSubRow</h3>
          <p className="repair-log-changes-page__description">
            Spare-part changes for a repair batch action. A part with no parent device is shown as
            Removed; otherwise Added.
          </p>
          <div className="repair-log-changes-page__content">
            <RepairLogChangesSubRow batchAction={sampleBatchAction} devices={sampleDevices} />
          </div>
        </div>

        <div>
          <h3>RepairLogChangesSubRow (Loading State)</h3>
          <p className="repair-log-changes-page__description">
            Shown while the parent is still fetching the devices referenced by the batch action.
          </p>
          <div className="repair-log-changes-page__content">
            <RepairLogChangesSubRow batchAction={sampleBatchAction} devices={[]} isLoading />
          </div>
        </div>
      </div>
    </section>
  )
}
