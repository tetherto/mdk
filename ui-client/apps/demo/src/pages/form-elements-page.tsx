import { useState } from 'react'
import { Input, TagInput } from '@tetherto/core'

export const FormElementsPage = (): JSX.Element => {
  const [tagInputTags, setTagInputTags] = useState<string[]>([])
  const [tagInputMinHeightTags, setTagInputMinHeightTags] = useState<string[]>([])
  const [tagInputMaxHeightTags, setTagInputMaxHeightTags] = useState<string[]>([])

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Form Elements</h2>
      <div className="demo-section__select-grid demo-section__input-grid">
        <section>
          <h3>Default</h3>
          <Input label="MAC Address" placeholder="Enter MAC address" id="mac-default" />
        </section>
        <section className="demo-section__input-grid__search">
          <h3>Search</h3>
          <Input variant="search" placeholder="Search" id="search-default" />
        </section>
        <section>
          <h3>With value</h3>
          <Input
            label="MAC Address"
            placeholder="Enter MAC address"
            defaultValue="00:11:22:33:44:55"
            id="mac-filled"
          />
        </section>
        <section>
          <h3>Disabled</h3>
          <Input label="MAC Address" placeholder="Enter MAC address" disabled id="mac-disabled" />
        </section>
        <section>
          <h3>Validation error</h3>
          <Input label="Email" placeholder="Email" error="Email is required" id="email-error" />
        </section>
        <section>
          <h3>TagInput</h3>
          <TagInput
            label="Search miners"
            value={tagInputTags}
            onTagsChange={setTagInputTags}
            onSubmit={(tags) => {
              console.warn('TagInput submit:', tags)
            }}
            options={[
              'Bitdeer M30',
              'Bitdeer A1346',
              'Bitdeer M56',
              'Bitdeer S19XP',
              'Bitmain Hydro',
              'Bitmain Imm',
              'MicroBT Wonder',
              'MicroBT Kehua',
            ]}
            placeholder="Search miners..."
            variant="search"
          />
        </section>
        <section>
          <h3>TagInput with min height</h3>
          <TagInput
            label="Search miners"
            value={tagInputMinHeightTags}
            onTagsChange={setTagInputMinHeightTags}
            options={['Bitdeer M30', 'Bitdeer A1346']}
            placeholder="Search miners..."
            variant="search"
            dropdownMinHeight="16rem"
          />
        </section>
        <section>
          <h3>TagInput with max height</h3>
          <TagInput
            label="Search miners"
            value={tagInputMaxHeightTags}
            onTagsChange={setTagInputMaxHeightTags}
            options={[
              'Bitdeer M30',
              'Bitdeer A1346',
              'Bitdeer M56',
              'Bitdeer S19XP',
              'Bitmain Hydro',
              'Bitmain Imm',
              'MicroBT Wonder',
              'MicroBT Kehua',
            ]}
            placeholder="Search miners..."
            variant="search"
            dropdownMaxHeight="6rem"
          />
        </section>
      </div>
    </section>
  )
}
