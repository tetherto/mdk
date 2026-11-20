/**
 * Runnable example for LabeledCard.
 */
import { LabeledCard } from '@tetherto/mdk-react-devkit'

const Placeholder = ({ text }: { text: string }) => (
  <div className="mdk-example-panel mdk-example-panel--compact mdk-example-surface mdk-example-caption">
    {text}
  </div>
)

export const LabeledCardExample = () => (
  <div className="mdk-example-col mdk-example-col--centered mdk-example-col--gap-lg">
    {/* Basic */}
    <LabeledCard label="Device Overview">
      <Placeholder text="Device stats here" />
    </LabeledCard>

    {/* Full width */}
    <LabeledCard label="Farm Summary" isFullWidth>
      <Placeholder text="Full-width card body" />
    </LabeledCard>

    {/* Dark variant */}
    <LabeledCard label="Metrics" isDark>
      <Placeholder text="Dark card body" />
    </LabeledCard>

    {/* No border */}
    <LabeledCard label="Borderless" hasNoBorder>
      <Placeholder text="Card without a border" />
    </LabeledCard>

    {/* With navigation link on the label */}
    <LabeledCard
      label="Pool Statistics"
      getNavigateOptions={() => ({ href: '#pool-stats', target: '_self' })}
    >
      <Placeholder text="Click the label to navigate" />
    </LabeledCard>
  </div>
)
