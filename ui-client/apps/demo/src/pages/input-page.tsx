import { Input, TagInput } from '@tetherto/mdk-core-ui'
import { useState } from 'react'

type InputRowProps = {
  state: string
  idSuffix: string
  disabled?: boolean
}

const InputRow = ({ state, idSuffix, disabled = false }: InputRowProps) => (
  <>
    <h2 className="demo-section__title">{state}</h2>
    <div
      className="demo-section__select-grid demo-section__input-grid"
      style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
    >
      <section>
        <h3>Default</h3>
        <Input placeholder="Input Big" id={`input-big-${idSuffix}`} disabled={disabled} />
      </section>
      <section>
        <h3>Default Search</h3>
        <Input
          variant="search"
          placeholder="Search"
          id={`search-${idSuffix}`}
          disabled={disabled}
        />
      </section>
      <section>
        <h3>Medium</h3>
        <Input
          size="medium"
          placeholder="Input Medium"
          id={`input-medium-${idSuffix}`}
          disabled={disabled}
        />
      </section>
      <section>
        <h3>Medium Search</h3>
        <Input
          size="medium"
          variant="search"
          placeholder="Search Medium"
          id={`search-medium-${idSuffix}`}
          disabled={disabled}
        />
      </section>
    </div>
  </>
)

const TAG_INPUT_OPTIONS = [
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'nodejs', label: 'Node.js', disabled: true },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
]

export const InputPage = (): JSX.Element => {
  const [tags, setTags] = useState<string[]>([])

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">TagInput</h2>
      <div style={{ maxWidth: 400, marginBottom: '24px' }}>
        <TagInput
          value={tags}
          onTagsChange={setTags}
          options={TAG_INPUT_OPTIONS}
          placeholder="Tags..."
        />
      </div>
      <InputRow state="Input - Default" idSuffix="default" />
      <div style={{ marginTop: 24 }}>
        <InputRow state="Input - Disabled" idSuffix="disabled" disabled />
      </div>
    </section>
  )
}
