import { ContainerCharts, TAGS_LABEL } from '@mdk/foundation'
import type { ChartEntry, ContainerChartsDatasetBorderColorResolver } from '@mdk/foundation'
import { useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'

const comboList = (Object.keys(TAGS_LABEL) as (keyof typeof TAGS_LABEL)[]).map((value) => ({
  value,
  label: TAGS_LABEL[value],
}))

const demoDatasetBorderColor: ContainerChartsDatasetBorderColorResolver = ({
  chartTitle,
  datasetLabel,
  datasetIndex,
}) => {
  const label = datasetLabel

  if (label.includes('-Oil-temp-1') || label.includes('Oil-temp-1')) return '#facc15'
  if (label.includes('-Oil-temp-2') || label.includes('Oil-temp-2')) return '#fb7185'

  if (label.includes('Tank-1')) return '#22d3ee'
  if (label.includes('Tank-2')) return '#f472b6'

  const byChartTitle: Record<string, string[]> = {
    'Liquid Temp H': ['#a5f3fc', '#fda4af'],
    'Liquid Temp L': ['#4ade80', '#a78bfa', '#fbbf24', '#f87171'],
    'Oil Temp': ['#fde047', '#f472b6', '#38bdf8', '#c084fc'],
    Pressure: ['#2dd4bf', '#818cf8', '#f97316', '#ec4899'],
  }
  const palette = byChartTitle[chartTitle]
  if (!palette?.length) return undefined
  return palette[datasetIndex % palette.length]
}

/** Representative overview row for Bitdeer-style devices */
const bitdeerChartRows: ChartEntry[] = [
  {
    ts: 1700000000,
    container_specific_stats_group_aggr: {
      'container-bd-d40-m30': {
        hot_temp_c_w_1_group: 52,
        hot_temp_c_w_2_group: 54,
        cold_temp_c_w_1_group: 38,
        cold_temp_c_w_2_group: 39,
        cold_temp_c_1_group: 36,
        cold_temp_c_2_group: 37,
        tank1_bar_group: 2.4,
        tank2_bar_group: 2.5,
      },
    },
  },
  {
    ts: 1700000900,
    container_specific_stats_group_aggr: {
      'container-bd-d40-m30': {
        hot_temp_c_w_1_group: 53,
        hot_temp_c_w_2_group: 55,
        cold_temp_c_w_1_group: 37,
        cold_temp_c_w_2_group: 38,
        cold_temp_c_1_group: 35,
        cold_temp_c_2_group: 36,
        tank1_bar_group: 2.45,
        tank2_bar_group: 2.55,
      },
    },
  },
]

const hydroChartRows: ChartEntry[] = [
  {
    ts: 1700000000,
    container_specific_stats_group_aggr: {
      'container-as-hk3': {
        supply_liquid_temp_group: 44,
        supply_liquid_pressure_group: 2.8,
      },
    },
  },
  {
    ts: 1700000900,
    container_specific_stats_group_aggr: {
      'container-as-hk3': {
        supply_liquid_temp_group: 45,
        supply_liquid_pressure_group: 2.85,
      },
    },
  },
]

const immersionOilChartRows: ChartEntry[] = [
  {
    ts: 1700000000,
    container_specific_stats_group_aggr: {
      'container-as-immersion_am-s19xp': {
        primary_supply_temp_group: 42,
        second_supply_temp1_group: 58,
        second_supply_temp2_group: 59,
      },
    },
  },
  {
    ts: 1700000900,
    container_specific_stats_group_aggr: {
      'container-as-immersion_am-s19xp': {
        primary_supply_temp_group: 43,
        second_supply_temp1_group: 59,
        second_supply_temp2_group: 60,
      },
    },
  },
]

const microbtChartRows: ChartEntry[] = [
  {
    ts: 1700000000,
    container_specific_stats_group_aggr: {
      'container-mbt-wonderint': {
        unit_inlet_temp_t2_group: 29,
        unit_outlet_pressure_p3_group: 1.7,
      },
    },
  },
]

const chartDataForCombination = (value: string): ChartEntry[] => {
  if (value.startsWith('bd-')) return bitdeerChartRows
  if (value.startsWith('as-hk3')) return hydroChartRows
  if (value.includes('immersion')) return immersionOilChartRows
  if (value.startsWith('mbt-')) return microbtChartRows
  return bitdeerChartRows
}

const AllCombosInteractiveDemo = (): JSX.Element => {
  const [value, setValue] = useState<string | null>('bd-d40-m30_wm-m30sp')
  const rows = value ? chartDataForCombination(value) : []
  return (
    <ContainerCharts
      combinations={comboList}
      selectedCombination={value}
      onSelectedCombinationChange={setValue}
      chartRawData={rows}
      getDatasetBorderColor={demoDatasetBorderColor}
    />
  )
}

const DemoPreview = ({ children }: { children: ReactNode }): JSX.Element => (
  <div
    style={{
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '1rem',
      maxWidth: 1100,
    }}
  >
    {children}
  </div>
)

export const ContainerChartsPage = (): JSX.Element => {
  const [controlled, setControlled] = useState<string | null>('bd-d40-m30_wm-m30sp')

  const controlledRows = useMemo(
    () => (controlled ? chartDataForCombination(controlled) : []),
    [controlled],
  )

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Container Charts</h2>
      <p className="demo-section__description">
        Overview dashboard for container miner combinations: combination selector plus liquid
        temperature (hot for Bitdeer), liquid low, oil (hidden for hydro / MicroBT), and pressure
        (hidden for immersion). Data and feature flags are passed in by the host app; chart series
        use the same adapters as miningos-app-ui. Every chart example below (except &quot;Default
        adapter colors&quot;) passes a demo-local <code>getDatasetBorderColor</code> so each series
        in a card gets its own color; production apps can omit it and keep adapter defaults.
      </p>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr' }}>
        <section>
          <h3>All preset combinations (from TAGS_LABEL) + matching mock series</h3>
          <p className="demo-section__description">
            Pick a combination to see which chart blocks appear. Mock rows switch shape for Bitdeer,
            Antspace Hydro, immersion, and MicroBT prefixes.
          </p>
          <DemoPreview>
            <AllCombosInteractiveDemo />
          </DemoPreview>
        </section>

        <section>
          <h3>Default adapter colors (no getDatasetBorderColor)</h3>
          <p className="demo-section__description">
            Same Bitdeer mock data as above; lines keep palette colors from the container chart
            adapters only.
          </p>
          <DemoPreview>
            <ContainerCharts
              combinations={comboList}
              defaultSelectedCombination="bd-d40-m30_wm-m30sp"
              chartRawData={bitdeerChartRows}
            />
          </DemoPreview>
        </section>

        <section>
          <h3>Antspace Hydro preset (no oil chart block)</h3>
          <DemoPreview>
            <ContainerCharts
              combinations={comboList}
              defaultSelectedCombination="as-hk3_am-s19xp_h"
              chartRawData={hydroChartRows}
              getDatasetBorderColor={demoDatasetBorderColor}
            />
          </DemoPreview>
        </section>

        <section>
          <h3>Feature disabled</h3>
          <DemoPreview>
            <ContainerCharts combinations={comboList} featureEnabled={false} />
          </DemoPreview>
        </section>

        <section>
          <h3>Loading combinations</h3>
          <DemoPreview>
            <ContainerCharts combinations={comboList} isLoadingCombinations />
          </DemoPreview>
        </section>

        <section>
          <h3>No combinations (empty list)</h3>
          <DemoPreview>
            <ContainerCharts combinations={[]} defaultSelectedCombination={null} />
          </DemoPreview>
        </section>

        <section>
          <h3>Controlled selection + data keyed to selection</h3>
          <DemoPreview>
            <ContainerCharts
              combinations={comboList}
              selectedCombination={controlled}
              onSelectedCombinationChange={setControlled}
              chartRawData={controlledRows}
              getDatasetBorderColor={demoDatasetBorderColor}
            />
          </DemoPreview>
        </section>

        <section>
          <h3>Charts loading state</h3>
          <DemoPreview>
            <ContainerCharts
              combinations={comboList}
              defaultSelectedCombination="bd-d40-s19xp_am-s19xp"
              chartRawData={bitdeerChartRows}
              isLoadingCharts
            />
          </DemoPreview>
        </section>

        <section>
          <h3>Custom title and disabled copy</h3>
          <DemoPreview>
            <ContainerCharts
              title="Site overview — containers"
              combinations={comboList.slice(0, 3)}
              featureEnabled={false}
              disabledMessage="Enable container analytics in site settings to view charts."
            />
          </DemoPreview>
        </section>
      </div>
    </section>
  )
}
