import type { ReactElement } from 'react'

import { DemoPageHeader } from '../../../components/demo-page-header'
import type { HashRateLogEntry, MinerPoolDataItem } from '@mdk/foundation'
import { HashRateLineChartSelector } from '@mdk/foundation'
import { DemoBlock } from '../../../components/demo-block'
import '../line-chart-page.scss'

const NOW_S = Math.floor(Date.now() / 1000)
const NOW_MS = NOW_S * 1000
const MIN_S = 60

const makeHashRateData = (
  count: number,
  stepS: number,
  baseVal: number,
  jitter = 0.02,
): HashRateLogEntry[] =>
  Array.from({ length: count }, (_, i) => {
    const ts = (NOW_S - (count - 1 - i) * stepS) * 1000
    const fluctuation = baseVal * jitter * (Math.random() * 2 - 1)
    return {
      ts,
      hashrate_mhs_1m_sum_aggr: Math.max(0, baseVal + fluctuation),
    }
  })

const makeRampData = (count: number, stepS: number): HashRateLogEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    ts: (NOW_S - (count - 1 - i) * stepS) * 1000,
    hashrate_mhs_1m_sum_aggr: 600_000 + i * 6_000 + Math.random() * 15_000,
  }))

const makeSpikeData = (count: number, stepS: number): HashRateLogEntry[] =>
  Array.from({ length: count }, (_, i) => {
    const base = 1_200_000
    const inDrop = i >= 40 && i < 55
    const inRecovery = i >= 55 && i < 70
    const value = inDrop
      ? base * 0.25
      : inRecovery
        ? base * 0.25 + ((i - 55) / 15) * base * 0.75
        : base + Math.random() * 25_000
    return {
      ts: (NOW_S - (count - 1 - i) * stepS) * 1000,
      hashrate_mhs_1m_sum_aggr: value,
    }
  })

const makeMinerPoolData = (
  count: number,
  stepS: number,
  poolTypes: string[],
): MinerPoolDataItem[] =>
  Array.from({ length: count }, (_, i) => ({
    ts: (NOW_S - (count - 1 - i) * stepS) * 1000,
    stats: poolTypes.map((poolType, pi) => ({
      poolType,
      hashrate: (0.4 + pi * 0.2) * (1_200_000 + Math.random() * 50_000),
    })),
  }))

const DATA_24H = makeHashRateData(288, 5 * MIN_S, 1_660_000)
const DATA_RAMP = makeRampData(180, MIN_S)
const DATA_SPIKE = makeSpikeData(100, 5 * MIN_S)

const TAIL_LOG_STEADY = makeHashRateData(288, 5 * MIN_S, 1_660_000)
const POOL_DATA_F2 = makeMinerPoolData(288, 5 * MIN_S, ['alpha-pool'])
const POOL_DATA_SPIKE = makeSpikeData(100, 5 * MIN_S).map((entry) => ({
  ts: entry.ts,
  stats: [
    {
      poolType: 'alpha-pool',
      hashrate: (entry.hashrate_mhs_1m_sum_aggr ?? 0) * 0.6,
    },
    {
      poolType: 'beta-pool',
      hashrate: (entry.hashrate_mhs_1m_sum_aggr ?? 0) * 0.4,
    },
  ],
}))

const REALTIME: HashRateLogEntry = {
  ts: NOW_MS,
  hashrate_mhs_1m_sum_aggr: 1_668_420,
}

export const HashRateLineChartSelectorDemo = (): ReactElement => {
  return (
    <div className="line-chart-page">
      <DemoPageHeader
        title="Hash Rate Line Chart"
        description={
          <>
            Selector routes to <code>HashRateLineChart</code> or{' '}
            <code>HashRateLineChartWithPool</code> based on the <code>hasPoolLine</code> prop
          </>
        }
      />

      <div className="line-chart-page__examples">
        <DemoBlock
          title="24 H Steady — with Realtime"
          description="288 data points at 5-min intervals (~1.66 PH/s). Realtime entry updates the current value independently."
        >
          <HashRateLineChartSelector data={DATA_24H} realtimeHashrateData={REALTIME} />
        </DemoBlock>

        <DemoBlock
          title="24 H Steady — no Realtime"
          description="Current value falls back to the last historical data point."
        >
          <HashRateLineChartSelector data={DATA_24H} />
        </DemoBlock>

        <DemoBlock
          title="Ramp-Up Pattern"
          description="180 data points at 1-min intervals showing a gradual hash rate increase from ~600 GH/s."
        >
          <HashRateLineChartSelector data={DATA_RAMP} />
        </DemoBlock>

        <DemoBlock
          title="Drop & Recovery Spike"
          description="Sharp hash rate drop to ~25% then full recovery. Tests Min/Max divergence in footer."
        >
          <HashRateLineChartSelector data={DATA_SPIKE} />
        </DemoBlock>

        <DemoBlock
          title="1 Min intervals enabled"
          description="isOneMinEnabled=true prepends a '1 Min' button to the range selector."
        >
          <HashRateLineChartSelector data={DATA_24H} isOneMinEnabled />
        </DemoBlock>

        <DemoBlock
          title="Custom Height — Compact (160px)"
          description="Smaller embed height — all controls remain visible."
        >
          <HashRateLineChartSelector data={DATA_24H} height={160} />
        </DemoBlock>

        <DemoBlock title="Loading State" description="loading=true — spinner shown, footer hidden.">
          <HashRateLineChartSelector loading data={[]} />
        </DemoBlock>

        <DemoBlock title="Empty State" description="No data, not loading — empty message shown.">
          <HashRateLineChartSelector data={[]} />
        </DemoBlock>

        {/* ── HashRateLineChartWithPool (hasPoolLine=true) ────────── */}

        <h2 className="line-chart-page__group-title">
          Pool Chart — <code>hasPoolLine=true</code>
        </h2>

        <DemoBlock
          title="Single Pool — Steady"
          description="One pool type. Shows MDK Hash Rate + Aggr Pool Hash Rate + Pool Hash Rate in legend."
        >
          <HashRateLineChartSelector
            hasPoolLine
            minerTailLogData={TAIL_LOG_STEADY}
            minerPoolDataRaw={POOL_DATA_F2}
          />
        </DemoBlock>

        <DemoBlock
          title="Pool Chart — Drop & Recovery"
          description="Hash rate and pool data both reflect the spike pattern. Min/Max divergence visible in footer."
        >
          <HashRateLineChartSelector
            hasPoolLine
            minerTailLogData={DATA_SPIKE}
            minerPoolDataRaw={POOL_DATA_SPIKE}
          />
        </DemoBlock>
      </div>
    </div>
  )
}
