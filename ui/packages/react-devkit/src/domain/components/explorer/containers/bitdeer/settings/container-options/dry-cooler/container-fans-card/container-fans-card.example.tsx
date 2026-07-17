import { ContainerFansCard } from '@tetherto/mdk-react-devkit'

export const ContainerFansCardExample = () => (
  <div className="mdk-example-row">
    <ContainerFansCard
      fansData={[
        { enabled: true, index: 0 },
        { enabled: false, index: 1 },
        { enabled: true, index: 2 },
      ]}
    />
  </div>
)
