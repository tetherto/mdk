/**
 * Runnable example for RepairLogChangesSubRow.
 */
import type { RepairBatchAction, RepairDevice } from '@tetherto/mdk-react-devkit'
import { RepairLogChangesSubRow } from '@tetherto/mdk-react-devkit'

const mockBatchAction: RepairBatchAction = {
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
  ],
}

const mockDevices: RepairDevice[] = [
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
]

export const RepairLogChangesSubRowExample = () => {
  return <RepairLogChangesSubRow batchAction={mockBatchAction} devices={mockDevices} />
}
