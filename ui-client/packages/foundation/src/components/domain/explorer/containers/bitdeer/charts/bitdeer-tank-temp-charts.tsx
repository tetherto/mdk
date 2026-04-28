import { CHART_COLORS, UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { CHART_TITLES } from '../../../../../../constants/charts'
import type {
  ChartDataPayload,
  ContainerChartsBuilderProps,
} from '../../../../container-charts-builder'
import ContainerChartsBuilder from '../../../../container-charts-builder'

type BitdeerTankTempChartsProps = {
  /** Tank number (1 or 2) */
  tankNumber?: number | string
  /** Date range for chart data */
} & ContainerChartsBuilderProps

/**
 * Tank Temperature Charts for Bitdeer containers
 *
 * Displays oil and water temperature readings (hot and cold) for a specific tank.
 *
 * Features:
 * - Tank Oil TempL (Cold) - Yellow line (4px)
 * - Tank Oil TempH (Hot) - Violet line
 * - Tank Water TempL (Cold) - Blue line
 * - Tank Water TempH (Hot) - Sky Blue line
 *
 * @example
 * ```tsx
 * <BitdeerTankTempCharts
 *   tag="container1"
 *   tankNumber={1}
 *   data={tempData}
 *   timeline="24h"
 * />
 * ```
 */
export const BitdeerTankTempCharts = ({
  tag,
  tankNumber = 1,
  dateRange,
  data,
  timeline,
  fixedTimezone,
  height,
}: BitdeerTankTempChartsProps): ReactElement | null => {
  const chartDataPayload = useMemo<ChartDataPayload>(
    () => ({
      unit: UNITS.TEMPERATURE_C,
      lines: [
        {
          label: `Tank${tankNumber} Oil TempL`,
          backendAttribute: `cold_temp_c_${tankNumber}_group`,
          borderColor: CHART_COLORS.yellow,
          borderWidth: 4,
          visible: true,
        },
        {
          label: `Tank${tankNumber} Oil TempH`,
          backendAttribute: `hot_temp_c_${tankNumber}_group`,
          borderColor: CHART_COLORS.VIOLET,
          visible: true,
        },
        {
          label: `Tank${tankNumber} Water TempL`,
          backendAttribute: `cold_temp_c_w_${tankNumber}_group`,
          borderColor: CHART_COLORS.blue,
          visible: true,
        },
        {
          label: `Tank${tankNumber} Water TempH`,
          backendAttribute: `hot_temp_c_w_${tankNumber}_group`,
          borderColor: CHART_COLORS.SKY_BLUE,
          visible: true,
        },
      ],
      currentValueLabel: {
        backendAttribute: `cold_temp_c_${tankNumber}_group`,
      },
    }),
    [tankNumber],
  )

  const chartTitle = useMemo(
    () => CHART_TITLES.TANK_OIL_TEMP.replace('TANK_NUMBER', String(tankNumber)),
    [tankNumber],
  )

  return (
    <ContainerChartsBuilder
      tag={tag}
      chartTitle={chartTitle}
      dateRange={dateRange}
      chartDataPayload={chartDataPayload}
      data={data}
      timeline={timeline}
      fixedTimezone={fixedTimezone}
      height={height}
    />
  )
}
