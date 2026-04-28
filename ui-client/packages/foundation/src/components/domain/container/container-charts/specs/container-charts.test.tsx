import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ContainerChartsProps } from '../container-charts'
import { ContainerCharts } from '../container-charts'
import type { ChartEntry } from '../container-charts.types'

vi.mock('../../../line-chart-card', () => ({
  LineChartCard: ({ title }: { title?: string }) => (
    <div className="mock-line-chart-card" data-lc-title={title} />
  ),
}))

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()

  return {
    ...actual,
    Spinner: () => <div data-testid="spinner" />,
    EmptyState: ({ description }: { description: ReactNode }) => (
      <div data-testid="empty-state">{description}</div>
    ),
  }
})

const comboOptions = [
  { value: 'bd-d40-m30_wm-m30sp', label: 'Bitdeer M30SP' },
  { value: 'as-hk3_am-s19xp_h', label: 'Bitmain Hydro S19XP' },
  { value: 'as-immersion_am-s19xp', label: 'Bitmain Immersion S19XP' },
  { value: 'mbt-wonderint_wm-m53s', label: 'MicroBt Wonderint' },
]

const bitdeerRow: ChartEntry = {
  ts: 1700000000,
  container_specific_stats_group_aggr: {
    'container-bd-d40-m30': {
      hot_temp_c_w_1_group: 50,
      cold_temp_c_w_1_group: 40,
      cold_temp_c_1_group: 35,
      tank1_bar_group: 2,
    },
  },
}

const renderPanel = (props: Partial<ContainerChartsProps> = {}) => {
  render(<ContainerCharts combinations={comboOptions} chartRawData={[bitdeerRow]} {...props} />)
}

const selectCombination = (value: string) => {
  fireEvent.change(screen.getByTestId('container-charts-combination-select'), {
    target: { value },
  })
}

describe('ContainerCharts', () => {
  it('renders disabled empty state when feature is off', () => {
    renderPanel({ featureEnabled: false, disabledMessage: 'Charts off' })
    expect(screen.getByTestId('empty-state')).toHaveTextContent('Charts off')
    expect(screen.queryByTestId('container-charts-combination-select')).not.toBeInTheDocument()
  })

  it('shows spinner while combinations load', () => {
    renderPanel({ isLoadingCombinations: true })
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('container-charts-combination-select')).not.toBeInTheDocument()
  })

  it('lists combination options in the select', () => {
    renderPanel()
    const select = screen.getByTestId('container-charts-combination-select') as HTMLSelectElement
    expect(select.options.length).toBeGreaterThanOrEqual(comboOptions.length + 1)
    expect([...select.options].some((o) => o.textContent === 'Bitdeer M30SP')).toBe(true)
  })

  it('for Bitdeer selection renders hot liquid chart plus cold, oil, and pressure', () => {
    renderPanel()
    selectCombination('bd-d40-m30_wm-m30sp')
    const panel = screen.getByTestId('container-charts-panel')
    expect(panel.querySelector('[data-lc-title="Liquid Temp H"]')).toBeTruthy()
    expect(panel.querySelector('[data-lc-title="Liquid Temp L"]')).toBeTruthy()
    expect(panel.querySelector('[data-lc-title="Oil Temp"]')).toBeTruthy()
    expect(panel.querySelector('[data-lc-title="Pressure"]')).toBeTruthy()
  })

  it('hides oil chart for Antspace Hydro combination', () => {
    renderPanel()
    selectCombination('as-hk3_am-s19xp_h')
    const panel = screen.getByTestId('container-charts-panel')
    expect(panel.querySelector('[data-lc-title="Oil Temp"]')).toBeNull()
    expect(panel.querySelector('[data-lc-title="Pressure"]')).toBeTruthy()
  })

  it('hides pressure chart for Bitmain Immersion combination', () => {
    renderPanel()
    selectCombination('as-immersion_am-s19xp')
    const panel = screen.getByTestId('container-charts-panel')
    expect(panel.querySelector('[data-lc-title="Pressure"]')).toBeNull()
    expect(panel.querySelector('[data-lc-title="Oil Temp"]')).toBeTruthy()
  })

  it('hides oil chart for MicroBT combination', () => {
    renderPanel()
    selectCombination('mbt-wonderint_wm-m53s')
    const panel = screen.getByTestId('container-charts-panel')
    expect(panel.querySelector('[data-lc-title="Oil Temp"]')).toBeNull()
    expect(panel.querySelector('[data-lc-title="Liquid Temp H"]')).toBeNull()
  })

  it('uses controlled selection from props', () => {
    const onChange = vi.fn()
    render(
      <ContainerCharts
        combinations={comboOptions}
        selectedCombination="bd-d40-m30_wm-m30sp"
        onSelectedCombinationChange={onChange}
        chartRawData={[bitdeerRow]}
      />,
    )
    const select = screen.getByTestId('container-charts-combination-select') as HTMLSelectElement
    expect(select.value).toBe('bd-d40-m30_wm-m30sp')
    fireEvent.change(select, { target: { value: 'as-hk3_am-s19xp_h' } })
    expect(onChange).toHaveBeenCalledWith('as-hk3_am-s19xp_h')
  })
})
