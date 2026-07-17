/**
 * Runnable example for TagInput.
 */
import { useState } from 'react'
import { TagInput } from '@tetherto/mdk-react-devkit'

const minerModels = [
  'Antminer S19 Pro',
  'Antminer S19j Pro',
  'Whatsminer M30S',
  'Whatsminer M50',
  'Avalon A1346',
]

export const TagInputExample = () => {
  const [tags, setTags] = useState<string[]>(['Antminer S19 Pro'])
  const [filters, setFilters] = useState<string[]>([])

  return (
    <div className="mdk-example-col">
      <TagInput
        value={tags}
        onTagsChange={setTags}
        options={minerModels}
        placeholder="Search miner models..."
        label="Miner Models"
      />

      <TagInput
        value={filters}
        onTagsChange={setFilters}
        options={['Online', 'Offline', 'Maintenance', 'Overclocked']}
        placeholder="Filter by status..."
        allowCustomTags={false}
        size="md"
      />
    </div>
  )
}
