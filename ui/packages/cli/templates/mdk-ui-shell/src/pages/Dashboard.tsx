import {
  useActiveIncidents,
  useDashboardDateRange,
  useDashboardExport,
  useDashboardTimeRange,
  useHashrateChartData,
  usePoolRows,
  useSiteConsumptionChartData,
} from '@tetherto/mdk-react-adapter'
import {
  ActiveIncidentsCard,
  DashboardDateRangePicker,
  ExportButton,
  LineChartCard,
  MiningPoolsPanel,
} from '@tetherto/mdk-react-devkit'

import { CHART_MIN_HEIGHT } from '../constants/dashboard'
import { PageLayout } from '../components/PageLayout'

const Dashboard = () => {
  const { timeline, setTimeline, options } = useDashboardTimeRange()
  const { start, end, setRange } = useDashboardDateRange()

  const hashrate = useHashrateChartData({ timeline, start, end })
  const consumption = useSiteConsumptionChartData({ timeline, start, end })
  const incidents = useActiveIncidents()
  const pools = usePoolRows()

  const { export: exportData } = useDashboardExport({ timeline, start, end })

  return (
    <PageLayout
      title="Dashboard"
      className="mdk-ui-shell-dashboard"
      actions={
        <>
          <DashboardDateRangePicker value={{ start, end }} onChange={(next) => setRange(next)} />
          <ExportButton onExport={exportData} />
        </>
      }
    >
      <LineChartCard
        title="Hash Rate"
        data={hashrate.data}
        isLoading={hashrate.isLoading}
        timelineOptions={options}
        timeline={timeline}
        onTimelineChange={setTimeline}
        minHeight={CHART_MIN_HEIGHT}
      />

      <LineChartCard
        title="Power Consumption"
        data={consumption.data}
        isLoading={consumption.isLoading}
        timelineOptions={options}
        timeline={timeline}
        onTimelineChange={setTimeline}
        minHeight={CHART_MIN_HEIGHT}
      />

      <div className="mdk-ui-shell-dashboard__row">
        <ActiveIncidentsCard
          items={incidents.data ?? []}
          isLoading={incidents.isLoading}
          emptyMessage="No active incidents"
        />
        <MiningPoolsPanel rows={pools.rows} isLoading={pools.isLoading} />
      </div>
    </PageLayout>
  )
}

export default Dashboard
