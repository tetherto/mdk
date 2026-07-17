import { CostContent } from '@tetherto/mdk-react-devkit'

export const CostContentExample = () => (
  <div className="mdk-example-row">
    <CostContent
      metrics={null}
      costLog={[]}
      btcPriceLog={[]}
      totals={null}
      dateRange={null}
      isLoading={false}
    />
  </div>
)
