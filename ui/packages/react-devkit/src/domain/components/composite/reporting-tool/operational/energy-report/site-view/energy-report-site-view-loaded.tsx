import { ReloadIcon } from '@radix-ui/react-icons'
import {
  Button,
  ChartContainer,
  DataTable,
  formatNumber,
  getDataTableColumnHelper,
  LineChart,
  SimpleTooltip,
  UNITS,
} from '@primitives'
import { useMemo } from 'react'

import { MinersActivityChart } from '../../../../../explorer/details-view/miners-activity-chart/miners-activity-chart'
import {
  ENERGY_REPORT_SITE_SECTION_HEADINGS,
  MINER_MODES,
  POWER_MODE_TABLE_MINER_TYPE_COLUMN_SIZE,
  POWER_MODE_TABLE_TOOLTIP,
} from '../energy-report.constants'
import type {
  EnergyReportSiteViewProps,
  PowerModeTableRow,
  UseEnergyReportSiteResult,
} from '../energy-report.types'
import { useEnergyReportSiteChart } from './use-energy-report-site-chart'

const columnHelper = getDataTableColumnHelper<PowerModeTableRow>()

const EMPTY_TABLE_SORTING: [] = []

type EnergyReportSiteViewLoadedProps = Pick<EnergyReportSiteViewProps, 'onRefetchSnapshot'> & {
  siteData: UseEnergyReportSiteResult
}

/**
 * Site tab body — mounted only after snapshot data is ready so chart/table
 * hooks do not run against a loading shell.
 */
export const EnergyReportSiteViewLoaded = ({
  siteData,
  onRefetchSnapshot,
}: EnergyReportSiteViewLoadedProps) => {
  const { powerConsumptionData, powerModeData, miningUnitCards } = siteData

  const { chartRef, legendData, lineChartData, yTicksFormatter, handleToggleDataset } =
    useEnergyReportSiteChart({ powerConsumption: powerConsumptionData })

  const columns = useMemo(
    () => [
      columnHelper.accessor('minerType', {
        header: 'Miner Type',
        enableSorting: false,
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
          enableSorting: false,
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

  const tableKey = useMemo(
    () => powerModeData.map((row) => row.minerType).join('\0'),
    [powerModeData],
  )

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
        <DataTable
          key={tableKey}
          columns={columns}
          data={powerModeData}
          enablePagination={false}
          sorting={EMPTY_TABLE_SORTING}
        />
      </section>

      <section className="mdk-energy-report-site-view__section">
        <h3 className="mdk-energy-report-site-view__heading">
          {ENERGY_REPORT_SITE_SECTION_HEADINGS.miningUnitPowerSummary}
        </h3>
        <div className="mdk-energy-report-site-view__cards">
          {miningUnitCards.map(({ container, containerId, chartData }) => (
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
          ))}
        </div>
      </section>
    </div>
  )
}
