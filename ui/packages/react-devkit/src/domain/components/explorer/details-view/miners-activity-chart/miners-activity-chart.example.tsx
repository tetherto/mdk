import { MinersActivityChart } from '@tetherto/mdk-react-devkit'

export const MinersActivityChartExample = () => (
  <div className="mdk-example-row">
    <MinersActivityChart
      data={{ online: [], offline: [], faulted: [] } as never}
      large={false}
      isLoading={false}
      isError={false}
      error={null}
      showLabel={true}
      isDemoMode={true}
    />
  </div>
)
