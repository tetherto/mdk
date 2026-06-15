import { ReloadIcon } from '@radix-ui/react-icons'
import {
  Button,
  ChartContainer,
  DataTable,
  formatNumber,
  getDataTableColumnHelper,
  LineChart,
  SimpleTooltip,
  Spinner,
  UNITS,
} from '@core'
import { useMemo } from 'react'

import { MinersActivityChart } from '../../../../../explorer/details-view/miners-activity-chart/miners-activity-chart'
import {
  ENERGY_REPORT_SITE_SECTION_HEADINGS,
  MINER_MODES,
  POWER_MODE_TABLE_MINER_TYPE_COLUMN_SIZE,
  POWER_MODE_TABLE_TOOLTIP,
} from '../energy-report.constants'
import { getContainerMinersChartData, readEnergyReportTailLogHead } from '../energy-report-site.utils'
import type {
  EnergyReportContainer,
  EnergyReportSiteViewProps,
  PowerModeTableRow,
} from '../energy-report.types'
import { useEnergyReportSite } from '../use-energy-report-site'
import { useEnergyReportSiteChart } from './use-energy-report-site-chart'
import './site-view.scss'

export type { EnergyReportSiteViewProps } from '../energy-report.types'

const columnHelper = getDataTableColumnHelper<PowerModeTableRow>()

/**
 * Energy report site tab — power trend, power-mode table, and per–mining-unit activity cards.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const EnergyReportSiteView = ({
  dateRange,
  onRefetchSnapshot,
  snapshotLoading,
  ...siteInput
}: EnergyReportSiteViewProps) => {
  const { powerConsumptionData, powerModeData, containers, tailLogData, isLoading } =
    useEnergyReportSite({ dateRange, ...siteInput })

  const { chartRef, legendData, lineChartData, yTicksFormatter, handleToggleDataset } =
    useEnergyReportSiteChart({ powerConsumption: powerConsumptionData })

  const tailLogItem = readEnergyReportTailLogHead(tailLogData)

  const columns = useMemo(
    () => [
      columnHelper.accessor('minerType', {
        header: 'Miner Type',
        minSize: POWER_MODE_TABLE_MINER_TYPE_COLUMN_SIZE,
        size: POWER_MODE_TABLE_MINER_TYPE_COLUMN_SIZE,
        cell: ({ row }) => {
          const record = row.original
          return (
            <div className="mdk-energy-report-site-view__miner-cell">
              <span className="mdk-energy-report-site-view__miner-title">{record.minerType}</span>
              <span className="mdk-energy-report-site-view__miner-sub">
                <SimpleTooltip content={POWER_MODE_TABLE_TOOLTIP}>
                  <span className="mdk-energy-report-site-view__miner-count">
                    {formatNumber(record.count as number, {}, '0')} miners
                  </span>
                </SimpleTooltip>
                <span aria-hidden>•</span>
                <span>{record.power}</span>
              </span>
            </div>
          )
        },
      }),
      ...MINER_MODES.map(({ mode, title, color }) =>
        columnHelper.accessor((row) => row[mode] as number, {
          id: mode,
          header: title,
          cell: ({ getValue }) => (
            <span className="mdk-energy-report-site-view__metric" style={{ color }}>
              {getValue() ?? 0}
            </span>
          ),
        }),
      ),
    ],
    [],
  )


  const showSpinner = isLoading || snapshotLoading

  if (showSpinner) {
    return (
      <div className="mdk-energy-report-site-view mdk-energy-report-site-view--loading">
        <Spinner color="secondary" size="lg" />
      </div>
    )
  }

  return (
    <div className="mdk-energy-report-site-view">
      <section className="mdk-energy-report-site-view__section">
        <h3 className="mdk-energy-report-site-view__heading">
          {ENERGY_REPORT_SITE_SECTION_HEADINGS.powerConsumption}
        </h3>
        <ChartContainer
          legendData={legendData}
          onToggleDataset={handleToggleDataset}
          loading={powerConsumptionData.isLoading}
          empty={
            !powerConsumptionData.isLoading && powerConsumptionData.data.length === 0
          }
        >
          <LineChart
            chartRef={chartRef}
            data={lineChartData}
            unit={UNITS.ENERGY_MW}
            yTicksFormatter={yTicksFormatter}
          />
        </ChartContainer>
      </section>

      <section className="mdk-energy-report-site-view__section">
        <div className="mdk-energy-report-site-view__section-header">
          <h3 className="mdk-energy-report-site-view__heading">
            {ENERGY_REPORT_SITE_SECTION_HEADINGS.powerModeByMinerType}
          </h3>
          {onRefetchSnapshot && (
            <Button icon={<ReloadIcon />} variant="secondary" onClick={onRefetchSnapshot}>
              Update data
            </Button>
          )}
        </div>
        <DataTable columns={columns} data={powerModeData} enablePagination={false} />
      </section>

      <section className="mdk-energy-report-site-view__section">
        <h3 className="mdk-energy-report-site-view__heading">
          {ENERGY_REPORT_SITE_SECTION_HEADINGS.miningUnitPowerSummary}
        </h3>
        <div className="mdk-energy-report-site-view__cards">
          {containers.map((container: EnergyReportContainer) => {
            const containerId = container.info?.container ?? ''
            const chartData = getContainerMinersChartData(
              containerId,
              tailLogItem,
              Number(container.info?.nominalMinerCapacity ?? 0),
            )
            return (
              <article key={containerId || container.containerId} className="mdk-energy-report-site-view__card">
                <header className="mdk-energy-report-site-view__card-header">
                  <span className="mdk-energy-report-site-view__card-title">{containerId}</span>
                  <span className="mdk-energy-report-site-view__card-sub">
                    {formatNumber(Number(container.minersCount ?? 0), {}, '0')} Miners
                  </span>
                </header>
                <div className="mdk-energy-report-site-view__card-chart">
                  <MinersActivityChart
                    data={chartData}
                    showLabel={false}
                    large={false}
                    isLoading={false}
                    isError={false}
                    error={null}
                    isDemoMode={false}
                  />
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
