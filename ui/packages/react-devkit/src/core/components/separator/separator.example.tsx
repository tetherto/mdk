/**
 * Runnable example for Separator (Radix Separator re-export).
 */
import { Separator } from '@tetherto/mdk-react-devkit'

export const SeparatorExample = () => (
  <div className="mdk-example-col">
    <div>
      <p>Section A</p>
      <Separator.Root
        decorative
        style={{ height: '1px', background: 'var(--mdk-color-border)', margin: '8px 0' }}
      />
      <p>Section B</p>
      <Separator.Root
        decorative
        style={{ height: '1px', background: 'var(--mdk-color-border)', margin: '8px 0' }}
      />
      <p>Section C</p>
    </div>

    <div className="mdk-example-inline">
      <span>Left</span>
      <Separator.Root
        decorative
        orientation="vertical"
        style={{
          width: '1px',
          height: '20px',
          background: 'var(--mdk-color-border)',
          margin: '0 8px',
        }}
      />
      <span>Right</span>
    </div>
  </div>
)
