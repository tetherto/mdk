import { BatchContainerControlsCard } from '@tetherto/mdk-react-devkit'

export const BatchContainerControlsCardExample = () => (
  <div className="mdk-example-row">
    <BatchContainerControlsCard
      isBatch={true}
      isCompact={false}
      connectedMiners={[]}
      alarmsDataItems={[]}
      onNavigate={(path) => console.warn('navigate', path)}
    />
  </div>
)
