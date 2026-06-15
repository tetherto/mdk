import type {
  EfficiencyDateRange,
  MetricsEfficiencyLogEntry,
} from '@tetherto/mdk-react-devkit/foundation'
import {
  MINER_TYPE_NAME_MAP,
  OperationsEfficiency,
  TAIL_LOG_CONTAINER_KEY,
  TAIL_LOG_MINER_TYPE_KEY,
  toOperationsEfficiencyMinerType,
  toOperationsEfficiencyMinerUnit,
} from '@tetherto/mdk-react-devkit/foundation'
import { differenceInDays, endOfDay, startOfDay, subDays } from 'date-fns'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { DemoBlock } from '../../../components/demo-block'
import { DemoPageHeader } from '../../../components/demo-page-header'

const NOW = Date.now()
const DAY_MS = 86_400_000

// 60 days of mock data so any date range within the last 2 months has entries
const MOCK_EFFICIENCY_LOG: MetricsEfficiencyLogEntry[] = Array.from({ length: 60 }, (_, i) => ({
  ts: NOW - (59 - i) * DAY_MS,
  efficiencyWThs: 20 + Math.sin(i / 3) * 3 + Math.random() * 1.5,
}))

const [firstMinerType] = Object.keys(MINER_TYPE_NAME_MAP)
const [secondMinerType] = Object.keys(MINER_TYPE_NAME_MAP).slice(1)

const buildContainerTailLog = (start: Date, end: Date) => {
  const days = Math.max(1, differenceInDays(end, start) + 1)
  const base = {
    container_01: +(22.5 - days * 0.06).toFixed(1),
    container_02: +(20.1 - days * 0.04).toFixed(1),
    container_03: +(24.7 - days * 0.05).toFixed(1),
  }
  return { [TAIL_LOG_CONTAINER_KEY]: base }
}

const buildMinerTypeTailLog = (start: Date, end: Date) => {
  const days = Math.max(1, differenceInDays(end, start) + 1)
  return {
    [TAIL_LOG_MINER_TYPE_KEY]: {
      ...(firstMinerType ? { [firstMinerType]: +(21.4 - days * 0.05).toFixed(1) } : {}),
      ...(secondMinerType ? { [secondMinerType]: +(23.8 - days * 0.07).toFixed(1) } : {}),
      unknown_miner_xyz: +(19.1 - days * 0.03).toFixed(1),
    },
  }
}

const buildDefaultEfficiencyDateRange = (): EfficiencyDateRange => {
  const yesterday = subDays(new Date(), 1)
  return {
    start: startOfDay(subDays(yesterday, 6)).getTime(),
    end: endOfDay(yesterday).getTime(),
  }
}

const FullShellDemo = () => {
  const defaultRange = useMemo(buildDefaultEfficiencyDateRange, [])
  const [dateRange, setDateRange] = useState<EfficiencyDateRange>(defaultRange)

  const [minerUnitRange, setMinerUnitRange] = useState<{ start: Date; end: Date }>({
    start: new Date(defaultRange.start),
    end: new Date(defaultRange.end),
  })
  const [minerTypeRange, setMinerTypeRange] = useState<{ start: Date; end: Date }>({
    start: new Date(defaultRange.start),
    end: new Date(defaultRange.end),
  })

  const filteredLog = useMemo(
    () => MOCK_EFFICIENCY_LOG.filter((e) => e.ts >= dateRange.start && e.ts <= dateRange.end),
    [dateRange],
  )

  const avgEfficiency = useMemo(
    () =>
      filteredLog.length > 0
        ? filteredLog.reduce((sum, e) => sum + e.efficiencyWThs, 0) / filteredLog.length
        : null,
    [filteredLog],
  )

  const handleReset = useCallback(() => setDateRange(defaultRange), [defaultRange])

  const containerTailLog = useMemo(
    () => buildContainerTailLog(minerUnitRange.start, minerUnitRange.end),
    [minerUnitRange],
  )
  const minerTypeTailLog = useMemo(
    () => buildMinerTypeTailLog(minerTypeRange.start, minerTypeRange.end),
    [minerTypeRange],
  )

  const minerType = toOperationsEfficiencyMinerType({ tailLog: minerTypeTailLog })
  const minerUnit = toOperationsEfficiencyMinerUnit({ tailLog: containerTailLog })

  return (
    <OperationsEfficiency
      siteView={{
        log: filteredLog,
        avgEfficiency,
        nominalValue: 22,
        dateRange,
        onDateRangeChange: setDateRange,
        onReset: handleReset,
      }}
      minerTypeView={{
        chartInput: minerType.chartInput,
        isEmpty: minerType.isEmpty,
        onTimeFrameChange: (start, end) => setMinerTypeRange({ start, end }),
      }}
      minerUnitView={{
        chartInput: minerUnit.chartInput,
        isEmpty: minerUnit.isEmpty,
        onTimeFrameChange: (start, end) => setMinerUnitRange({ start, end }),
      }}
    />
  )
}

export const OperationalEfficiencyDemo = (): ReactElement => {
  return (
    <div>
      <DemoPageHeader title="Operational Efficiency" />

      <DemoBlock
        title="Full Shell (all 3 tabs)"
        description="Miner Type / Mining Unit tabs re-compute averages as you change the time frame selector"
      >
        <FullShellDemo />
      </DemoBlock>
    </div>
  )
}
