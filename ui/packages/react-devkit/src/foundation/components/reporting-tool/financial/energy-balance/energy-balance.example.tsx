import { EnergyBalance } from '@tetherto/mdk-react-devkit'

export const EnergyBalanceExample = () => (
  <div className="mdk-example-row">
    <EnergyBalance
      viewModel={{
        revenueMetrics: null,
        costMetrics: null,
        energyRevenueChartInput: { datasets: [], threshold: null } as never,
        downtimeChartInput: { datasets: [], threshold: null } as never,
        powerChartInput: { datasets: [], threshold: null } as never,
        powerChartCostInput: { datasets: [], threshold: null } as never,
        energyCostChartInput: { datasets: [], btcUnit: 'BTC', threshold: null } as never,
        activeTab: 'revenue',
        revenueDisplayMode: 'USD',
        costDisplayMode: 'USD',
        revenueBarLabelFormatter: (v) => String(v),
        costBarLabelFormatter: (v) => String(v),
        period: 'monthly',
        periodType: 'month',
        hasData: false,
        isLoading: false,
        errors: [],
        hasDateSelection: false,
      }}
      onTabChange={() => undefined}
      onRevenueDisplayModeChange={() => undefined}
      onCostDisplayModeChange={() => undefined}
    />
  </div>
)
