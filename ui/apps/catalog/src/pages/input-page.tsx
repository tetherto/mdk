import { Input, TagInput } from '@tetherto/mdk-react-devkit/primitives'
import { useState } from 'react'
import type { JSX } from 'react'

import { InputFieldStates } from './input-field-states'

type InputRowProps = {
  state: string
  idSuffix: string
  disabled?: boolean
}

const InputRow = ({ state, idSuffix, disabled = false }: InputRowProps) => (
  <>
    <h2 className="demo-section__title">{state}</h2>
    <div className="demo-section__select-grid demo-section__select-grid--2-col demo-section__input-grid">
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
      <div className="demo-section__tag-input-demo">
        <TagInput
          value={tags}
          onTagsChange={setTags}
          options={TAG_INPUT_OPTIONS}
          placeholder="Tags..."
        />
      </div>
      <InputRow state="Input - Default" idSuffix="default" />
      <div className="demo-section__mt-xl">
        <InputRow state="Input - Disabled" idSuffix="disabled" disabled />
      </div>
      <InputFieldStates />
    </section>
  )
}
