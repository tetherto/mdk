import type { JSX } from 'react'
import { useState } from 'react'

import { Button, Card } from '@tetherto/mdk-react-devkit/primitives'

import { DemoBlock } from '../../components/demo-block'
import { DemoPageHeader } from '../../components/demo-page-header'

import './theming-demo-page.scss'

const PRESETS: Array<{ id: string; label: string; tokens: Record<string, string> }> = [
  {
    id: 'default',
    label: 'Default (orange)',
    tokens: {},
  },
  {
    id: 'azure',
    label: 'Azure',
    tokens: {
      '--mdk-color-primary': '#5b8cff',
      '--mdk-color-primary-button-hover': '#7fa3ff',
      '--mdk-button-primary-bg': '#5b8cff',
      '--mdk-button-primary-bg-hover': '#7fa3ff',
      '--mdk-button-primary-text': '#ffffff',
      '--mdk-radius': '6px',
    },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    tokens: {
      '--mdk-color-primary': '#34c759',
      '--mdk-color-primary-button-hover': '#5cd47a',
      '--mdk-button-primary-bg': '#34c759',
      '--mdk-button-primary-bg-hover': '#5cd47a',
      '--mdk-button-primary-text': '#0a0a0a',
      '--mdk-radius': '12px',
    },
  },
  {
    id: 'magenta',
    label: 'Magenta squared',
    tokens: {
      '--mdk-color-primary': '#d946ef',
      '--mdk-color-primary-button-hover': '#e879f9',
      '--mdk-button-primary-bg': '#d946ef',
      '--mdk-button-primary-bg-hover': '#e879f9',
      '--mdk-button-primary-text': '#ffffff',
      '--mdk-radius': '0px',
    },
  },
]

const CODE_OVERRIDE = `/* app.css imported AFTER @tetherto/mdk-react-devkit/styles.css */
:root {
  --mdk-color-primary: #5b8cff;
  --mdk-button-primary-bg: #5b8cff;
  --mdk-button-primary-bg-hover: #7fa3ff;
  --mdk-button-primary-text: #ffffff;
  --mdk-radius: 6px;
}`

const CODE_CLASS_OVERRIDE = `/* The cascade-layer order @layer base, mdk, app
   means anything in @layer app (or unlayered) wins
   over devkit component styles automatically. */

@layer app {
  .mdk-button--variant-primary { letter-spacing: 0.06em; }
  .mdk-card { border-color: rgba(255,255,255,0.18); }
}`

export const ThemingDemoPage = (): JSX.Element => {
  const [presetId, setPresetId] = useState(PRESETS[0]!.id)
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]!

  return (
    <div>
      <DemoPageHeader
        title="Theming &amp; CSS overrides"
        description="The devkit declares @layer base, mdk, app at the top of its stylesheet so apps can override design tokens or component classes without specificity hacks. Pick a preset to see the same components rebranded purely through CSS custom properties."
      />

      <DemoBlock
        title="Token presets"
        description="Each preset scopes a set of --mdk-* overrides to the preview area below. The exact tokens are listed in the code block underneath."
      >
        <div className="theming-demo__preset-row">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              variant={p.id === presetId ? 'primary' : 'secondary'}
              onClick={() => setPresetId(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="theming-demo__preview" style={preset.tokens as React.CSSProperties}>
          <Card>
            <div className="theming-demo__card">
              <h3>Preview</h3>
              <p>
                Buttons, focus rings and radii in this card are driven entirely by the active
                preset's tokens.
              </p>
              <div className="theming-demo__buttons">
                <Button variant="primary" size="md">
                  Primary
                </Button>
                <Button variant="secondary" size="md">
                  Secondary
                </Button>
                <Button variant="tertiary" size="md">
                  Tertiary
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <pre>
          <code>
            {Object.keys(preset.tokens).length === 0
              ? '/* default — no overrides */'
              : JSON.stringify(preset.tokens, null, 2)}
          </code>
        </pre>
      </DemoBlock>

      <DemoBlock
        title="Recipe — re-skin via design tokens"
        description="Token overrides are the recommended customisation path. They flow through every component that consumes them."
      >
        <pre>
          <code>{CODE_OVERRIDE}</code>
        </pre>
      </DemoBlock>

      <DemoBlock
        title="Recipe — escape hatch via class overrides"
        description="When you need a one-off tweak that isn't expressible as a token, target the public BEM classes inside @layer app."
      >
        <pre>
          <code>{CODE_CLASS_OVERRIDE}</code>
        </pre>
      </DemoBlock>
    </div>
  )
}
