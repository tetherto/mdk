/**
 * Runnable example for MultiLevelSelect.
 */
import { useState } from 'react'

import { MultiLevelSelect } from '@tetherto/mdk-react-devkit'

export const MultiLevelSelectExample = () => {
  const [worker, setWorker] = useState('')

  return (
    <div className="mdk-example-col">
      <MultiLevelSelect.Root value={worker} onValueChange={setWorker}>
        <MultiLevelSelect.Trigger>
          <MultiLevelSelect.Value placeholder="Select worker..." />
        </MultiLevelSelect.Trigger>
        <MultiLevelSelect.Content>
          <MultiLevelSelect.Section sectionTitle="Foundry EU" defaultOpen>
            <MultiLevelSelect.Item value="worker-eu-1">Worker EU-1</MultiLevelSelect.Item>
            <MultiLevelSelect.Item value="worker-eu-2">Worker EU-2</MultiLevelSelect.Item>
          </MultiLevelSelect.Section>
          <MultiLevelSelect.Section sectionTitle="AntPool">
            <MultiLevelSelect.Item value="worker-ap-1">Worker AP-1</MultiLevelSelect.Item>
          </MultiLevelSelect.Section>
        </MultiLevelSelect.Content>
      </MultiLevelSelect.Root>
    </div>
  )
}
