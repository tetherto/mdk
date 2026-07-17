import { ContainerFanLegend } from '@tetherto/mdk-react-devkit'

export const ContainerFanLegendExample = () => (
  <div className="mdk-example-row">
    <ContainerFanLegend index={1} enabled={true} />
    <ContainerFanLegend index={2} enabled={false} />
  </div>
)
