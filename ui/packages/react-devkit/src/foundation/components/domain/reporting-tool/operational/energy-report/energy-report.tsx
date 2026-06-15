import type { DateRange } from '@core'
import { Button, DateRangePicker, Tabs, TabsContent, TabsList, TabsTrigger } from '@core'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { useCallback, useMemo, useState } from 'react'

import {
  ENERGY_REPORT_TAB_TYPES,
  ENERGY_REPORT_TABS,
} from './energy-report.constants'
import { getEnergyReportDefaultDateRange } from './energy-report-date.utils'
import type { EnergyReportDateRange } from './energy-report.constants'
import './energy-report.scss'
import type {
  EnergyReportProps,
  EnergyReportSiteViewProps,
  EnergyReportTabValue,
} from './energy-report.types'
import { EnergyReportMinerTypeView } from './miner-type-view/miner-type-view'
import { EnergyReportMinerUnitView } from './miner-unit-view/miner-unit-view'
import { EnergyReportSiteView } from './site-view/site-view'

export type { EnergyReportProps, EnergyReportTabValue } from './energy-report.types'

const toPickerRange = (range: EnergyReportDateRange): DateRange => ({
  from: new Date(range.start),
  to: new Date(range.end),
})

/**
 * Operational Energy report — site consumption trend, power modes by miner type,
 * and per–mining-unit / per–miner-type bar charts.
 *
 * @category dashboards
 * @domain mining-operations
 * @orkCapability energy-consumption
 * @tier agent-ready
 */
export const EnergyReport = ({
  defaultTab = ENERGY_REPORT_TAB_TYPES.SITE_VIEW,
  siteView,
  minerTypeView,
  minerUnitView,
  className,
}: EnergyReportProps) => {
  const [activeTab, setActiveTab] = useState<EnergyReportTabValue>(defaultTab)
  const defaultSiteRange = useMemo(() => getEnergyReportDefaultDateRange(), [])
  const [siteDateRangeInternal, setSiteDateRangeInternal] =
    useState<EnergyReportDateRange>(defaultSiteRange)

  const siteDateRange = siteView?.dateRange ?? siteDateRangeInternal

  const handleSiteRangeSelect = useCallback(
    (selected: DateRange | undefined) => {
      if (!selected?.from) return
      const next: EnergyReportDateRange = {
        start: startOfDay(selected.from).getTime(),
        end: endOfDay(selected.to ?? selected.from).getTime(),
      }
      if (siteView?.dateRange == null) {
        setSiteDateRangeInternal(next)
      }
      siteView?.onDateRangeChange?.(next)
    },
    [siteView],
  )

  const resetSiteRange = useCallback(() => {
    const next = getEnergyReportDefaultDateRange()
    if (siteView?.dateRange == null) {
      setSiteDateRangeInternal(next)
    }
    siteView?.onDateRangeChange?.(next)
  }, [siteView])

  const resolvedSiteView: EnergyReportSiteViewProps = {
    ...siteView,
    dateRange: siteDateRange,
  }

  return (
    <div className={['mdk-energy-report', className].filter(Boolean).join(' ')}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as EnergyReportTabValue)}
      >
        <TabsList>
          {ENERGY_REPORT_TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab === ENERGY_REPORT_TAB_TYPES.SITE_VIEW && (
          <div className="mdk-energy-report__date-controls">
            <DateRangePicker
              selected={toPickerRange(resolvedSiteView.dateRange)}
              onSelect={handleSiteRangeSelect}
            />
            <Button variant="secondary" type="button" onClick={resetSiteRange}>
              Reset
            </Button>
          </div>
        )}

        <TabsContent value={ENERGY_REPORT_TAB_TYPES.SITE_VIEW}>
          <EnergyReportSiteView {...resolvedSiteView} />
        </TabsContent>
        <TabsContent value={ENERGY_REPORT_TAB_TYPES.MINER_TYPE_VIEW}>
          <EnergyReportMinerTypeView {...minerTypeView} />
        </TabsContent>
        <TabsContent value={ENERGY_REPORT_TAB_TYPES.MINER_UNIT_VIEW}>
          <EnergyReportMinerUnitView {...minerUnitView} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
