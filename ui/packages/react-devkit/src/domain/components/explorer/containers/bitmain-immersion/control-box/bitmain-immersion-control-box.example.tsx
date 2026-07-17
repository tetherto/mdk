import { BitMainImmersionControlBox } from '@tetherto/mdk-react-devkit'

export const BitMainImmersionControlBoxExample = () => (
  <div className="mdk-example-row">
    <BitMainImmersionControlBox
      title="Pump Station"
      leftContent={<span>Left content</span>}
      rightContent={<span>Right content</span>}
      bottomContent={<span>Bottom content</span>}
    />
  </div>
)
