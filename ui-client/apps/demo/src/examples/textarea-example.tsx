import { TextArea } from '@tetherto/core'

import { DemoPageHeader } from '../components/demo-page-header'

export const TextAreaExample = (): React.ReactElement => {
  return (
    <section className="demo-section">
      <DemoPageHeader title="TextArea" />
      <div className="demo-section__select-grid demo-section__input-grid">
        <section>
          <h3>Default</h3>
          <TextArea label="Description" placeholder="Enter description" id="ta-default" />
        </section>
        <section>
          <h3>With value</h3>
          <TextArea
            label="Notes"
            placeholder="Enter notes"
            defaultValue="This is a pre-filled textarea with some content."
            id="ta-filled"
          />
        </section>
        <section>
          <h3>Disabled</h3>
          <TextArea label="Read Only" placeholder="Cannot edit" disabled id="ta-disabled" />
        </section>
        <section>
          <h3>Validation error</h3>
          <TextArea
            label="Comment"
            placeholder="Enter comment"
            error="Comment is required"
            id="ta-error"
          />
        </section>
      </div>
    </section>
  )
}

export default TextAreaExample
