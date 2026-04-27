import { UNITS } from '@mdk/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChartContainer } from '../index'

vi.mock('../../../utils', () => ({
  cn: (...args: unknown[]) =>
    args
      .flatMap((a) =>
        typeof a === 'string'
          ? a
          : typeof a === 'object' && a !== null
            ? Object.entries(a)
                .filter(([, v]) => Boolean(v))
                .map(([k]) => k)
            : [],
      )
      .filter(Boolean)
      .join(' '),
}))

vi.mock('../../loader', () => ({
  Loader: vi.fn(() => <div data-testid="loader" />),
}))

vi.mock('../../radio', () => ({
  RadioGroup: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="radio-group">{children}</div>
  )),
  RadioCard: vi.fn(({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick}>{label}</button>
  )),
}))

const defaultProps = {
  children: <div data-testid="chart-content">Chart</div>,
}

const rangeSelector = {
  options: [
    { label: '5 Min', value: '5m' },
    { label: '1 H', value: '1h' },
  ],
  value: '5m',
  onChange: vi.fn(),
}

const legendData = [
  { label: 'Series A', color: '#ff0000' },
  { label: 'Series B', color: '#00ff00', hidden: true },
]

const minMaxAvg = {
  min: `1.00 ${UNITS.HASHRATE_TH_S}`,
  avg: `1.50 ${UNITS.HASHRATE_TH_S}`,
  max: `2.00 ${UNITS.HASHRATE_TH_S}`,
}

describe('ChartContainer', () => {
  describe('rendering', () => {
    it('renders the wrapper with correct class', () => {
      const { container } = render(<ChartContainer {...defaultProps} />)

      expect(container.querySelector('.mdk-chart-container')).toBeInTheDocument()
    })

    it('renders children', () => {
      render(<ChartContainer {...defaultProps} />)

      expect(screen.getByTestId('chart-content')).toBeInTheDocument()
    })

    it('sets displayName', () => {
      expect(ChartContainer.displayName).toBe('ChartContainer')
    })

    it('forwards ref to the wrapper div', () => {
      const ref = { current: null }
      render(<ChartContainer {...defaultProps} ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('applies custom className', () => {
      const { container } = render(<ChartContainer {...defaultProps} className="custom-class" />)

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('grid layout', () => {
    it('applies grid class when legendData is provided', () => {
      const { container } = render(<ChartContainer {...defaultProps} legendData={legendData} />)

      expect(container.querySelector('.mdk-chart-container--grid')).toBeInTheDocument()
    })

    it('applies grid class when highlightedValue is provided', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} highlightedValue={{ value: '3.59', unit: 'PH/s' }} />,
      )

      expect(container.querySelector('.mdk-chart-container--grid')).toBeInTheDocument()
    })

    it('applies grid class when rangeSelector is provided', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} rangeSelector={rangeSelector} />,
      )

      expect(container.querySelector('.mdk-chart-container--grid')).toBeInTheDocument()
    })

    it('does not apply grid class without grid-triggering props', () => {
      const { container } = render(<ChartContainer {...defaultProps} title="My Chart" />)

      expect(container.querySelector('.mdk-chart-container--grid')).not.toBeInTheDocument()
    })
  })

  describe('title and header', () => {
    it('renders title as h3', () => {
      render(<ChartContainer {...defaultProps} title="Revenue" />)

      expect(screen.getByRole('heading', { name: 'Revenue', level: 3 })).toBeInTheDocument()
    })

    it('renders custom header instead of title when both provided', () => {
      render(
        <ChartContainer
          {...defaultProps}
          title="Revenue"
          header={<div data-testid="custom-header">Custom</div>}
        />,
      )

      expect(screen.getByTestId('custom-header')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Revenue' })).not.toBeInTheDocument()
    })

    it('renders header-row in simple layout', () => {
      const { container } = render(<ChartContainer {...defaultProps} title="Revenue" />)

      expect(container.querySelector('.mdk-chart-container__header-row')).toBeInTheDocument()
    })

    it('renders title-area in grid layout', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} title="Revenue" rangeSelector={rangeSelector} />,
      )

      expect(container.querySelector('.mdk-chart-container__title-area')).toBeInTheDocument()
    })
  })

  describe('range selector', () => {
    it('calls onChange when a range button is clicked', () => {
      const onChange = vi.fn()
      render(<ChartContainer {...defaultProps} rangeSelector={{ ...rangeSelector, onChange }} />)

      fireEvent.click(screen.getByText('1 H'))

      expect(onChange).toHaveBeenCalledWith('1h')
    })

    it('does not render range selector when options is empty', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} rangeSelector={{ ...rangeSelector, options: [] }} />,
      )

      expect(container.querySelector('[aria-label="Time range"]')).not.toBeInTheDocument()
    })
  })

  describe('legend', () => {
    it('renders a button per legend item', () => {
      render(<ChartContainer {...defaultProps} legendData={legendData} />)

      expect(screen.getAllByRole('button', { name: /Series/ })).toHaveLength(legendData.length)
    })

    it('renders legend item labels', () => {
      render(<ChartContainer {...defaultProps} legendData={legendData} />)

      expect(screen.getByText('Series A')).toBeInTheDocument()
      expect(screen.getByText('Series B')).toBeInTheDocument()
    })

    it('reduces opacity for hidden legend items', () => {
      render(<ChartContainer {...defaultProps} legendData={legendData} />)

      const buttons = screen.getAllByRole('button', { name: /Series/ })
      const hiddenButton = buttons.find((b) => b.textContent?.includes('Series B'))
      expect(hiddenButton).toHaveStyle({ opacity: '0.3' })
    })

    it('applies full opacity for visible legend items', () => {
      render(<ChartContainer {...defaultProps} legendData={legendData} />)

      const buttons = screen.getAllByRole('button', { name: /Series/ })
      const visibleButton = buttons.find((b) => b.textContent?.includes('Series A'))
      expect(visibleButton).toHaveStyle({ opacity: '1' })
    })

    it('calls onToggleDataset with correct index when legend item clicked', () => {
      const onToggleDataset = vi.fn()
      render(
        <ChartContainer
          {...defaultProps}
          legendData={legendData}
          onToggleDataset={onToggleDataset}
        />,
      )

      fireEvent.click(screen.getByText('Series B'))

      expect(onToggleDataset).toHaveBeenCalledWith(1)
    })

    it('does not render legend area when legendData is empty', () => {
      const { container } = render(<ChartContainer {...defaultProps} legendData={[]} />)

      expect(container.querySelector('.mdk-chart-container__legend')).not.toBeInTheDocument()
    })
  })

  describe('highlighted value', () => {
    it('renders the value', () => {
      render(<ChartContainer {...defaultProps} highlightedValue={{ value: '3.59' }} />)

      expect(screen.getByText('3.59')).toBeInTheDocument()
    })

    it('renders the unit when provided', () => {
      render(
        <ChartContainer {...defaultProps} highlightedValue={{ value: '3.59', unit: 'PH/s' }} />,
      )

      expect(screen.getByText('PH/s')).toBeInTheDocument()
    })

    it('does not render unit when not provided', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} highlightedValue={{ value: '3.59' }} />,
      )

      expect(
        container.querySelector('.mdk-chart-container__highlighted-value__unit'),
      ).not.toBeInTheDocument()
    })

    it('applies custom className to highlighted value wrapper', () => {
      const { container } = render(
        <ChartContainer
          {...defaultProps}
          highlightedValue={{ value: '3.59', className: 'custom-highlight' }}
        />,
      )

      expect(container.querySelector('.custom-highlight')).toBeInTheDocument()
    })

    it('applies custom style to highlighted value wrapper', () => {
      const { container } = render(
        <ChartContainer
          {...defaultProps}
          highlightedValue={{ value: '3.59', style: { color: 'rgb(255, 0, 0)' } }}
        />,
      )

      const el = container.querySelector('.mdk-chart-container__highlighted-value')
      expect(el).toHaveStyle({ color: 'rgb(255, 0, 0)' })
    })

    it('renders inside highlight-area in grid layout', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} highlightedValue={{ value: '3.59', unit: 'PH/s' }} />,
      )

      expect(container.querySelector('.mdk-chart-container__highlight-area')).toBeInTheDocument()
    })
  })

  describe('minMaxAvg', () => {
    it('renders Min label and value', () => {
      render(
        <ChartContainer {...defaultProps} minMaxAvg={minMaxAvg} rangeSelector={rangeSelector} />,
      )

      expect(screen.getByText('Min')).toBeInTheDocument()
      expect(screen.getByText(`1.00 ${UNITS.HASHRATE_TH_S}`)).toBeInTheDocument()
    })

    it('renders Avg label and value', () => {
      render(
        <ChartContainer {...defaultProps} minMaxAvg={minMaxAvg} rangeSelector={rangeSelector} />,
      )

      expect(screen.getByText('Avg')).toBeInTheDocument()
      expect(screen.getByText(`1.50 ${UNITS.HASHRATE_TH_S}`)).toBeInTheDocument()
    })

    it('renders Max label and value', () => {
      render(
        <ChartContainer {...defaultProps} minMaxAvg={minMaxAvg} rangeSelector={rangeSelector} />,
      )

      expect(screen.getByText('Max')).toBeInTheDocument()
      expect(screen.getByText(`2.00 ${UNITS.HASHRATE_TH_S}`)).toBeInTheDocument()
    })

    it('renders stats inside footer-area', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} minMaxAvg={minMaxAvg} rangeSelector={rangeSelector} />,
      )

      expect(container.querySelector('.mdk-chart-container__footer-area')).toBeInTheDocument()
      expect(container.querySelector('.mdk-chart-container__stats')).toBeInTheDocument()
    })

    it('does not render stats when loading', () => {
      render(
        <ChartContainer
          {...defaultProps}
          loading
          minMaxAvg={minMaxAvg}
          rangeSelector={rangeSelector}
        />,
      )

      expect(screen.queryByText('Min')).not.toBeInTheDocument()
      expect(screen.queryByText('Avg')).not.toBeInTheDocument()
      expect(screen.queryByText('Max')).not.toBeInTheDocument()
    })

    it('does not render stats when empty', () => {
      render(
        <ChartContainer
          {...defaultProps}
          empty
          minMaxAvg={minMaxAvg}
          rangeSelector={rangeSelector}
        />,
      )

      expect(screen.queryByText('Min')).not.toBeInTheDocument()
      expect(screen.queryByText('Avg')).not.toBeInTheDocument()
      expect(screen.queryByText('Max')).not.toBeInTheDocument()
    })

    it('does not render stats when minMaxAvg is not provided', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} rangeSelector={rangeSelector} />,
      )

      expect(container.querySelector('.mdk-chart-container__stats')).not.toBeInTheDocument()
    })

    it('renders stats with correct classes on labels and values', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} minMaxAvg={minMaxAvg} rangeSelector={rangeSelector} />,
      )

      expect(container.querySelectorAll('.mdk-chart-container__stats-label')).toHaveLength(3)
      expect(container.querySelectorAll('.mdk-chart-container__stats-value')).toHaveLength(3)
    })
  })

  describe('footer', () => {
    it('renders custom footer content', () => {
      render(
        <ChartContainer {...defaultProps} footer={<div data-testid="footer">Min/Max/Avg</div>} />,
      )

      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('applies custom footerClassName to footer-area', () => {
      const { container } = render(
        <ChartContainer
          {...defaultProps}
          footer={<span>Footer</span>}
          footerClassName="custom-footer"
        />,
      )

      expect(container.querySelector('.custom-footer')).toBeInTheDocument()
    })

    it('does not render footer-area when neither footer nor minMaxAvg is provided', () => {
      const { container } = render(<ChartContainer {...defaultProps} />)

      expect(container.querySelector('.mdk-chart-container__footer-area')).not.toBeInTheDocument()
    })

    it('renders footer-area when only minMaxAvg is provided', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} minMaxAvg={minMaxAvg} rangeSelector={rangeSelector} />,
      )

      expect(container.querySelector('.mdk-chart-container__footer-area')).toBeInTheDocument()
    })

    it('renders both builtInFooter and custom footer together', () => {
      render(
        <ChartContainer
          {...defaultProps}
          minMaxAvg={minMaxAvg}
          rangeSelector={rangeSelector}
          footer={<div data-testid="custom-footer">Extra</div>}
        />,
      )

      expect(screen.getByText('Min')).toBeInTheDocument()
      expect(screen.getByTestId('custom-footer')).toBeInTheDocument()
    })

    it('hides footer-area while loading', () => {
      const { container } = render(
        <ChartContainer
          {...defaultProps}
          loading
          footer={<div data-testid="footer">Footer</div>}
        />,
      )

      expect(container.querySelector('.mdk-chart-container__footer-area')).not.toBeInTheDocument()
      expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
    })

    it('hides footer-area when empty', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} empty footer={<div data-testid="footer">Footer</div>} />,
      )

      expect(container.querySelector('.mdk-chart-container__footer-area')).not.toBeInTheDocument()
      expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders loader when loading is true', () => {
      render(<ChartContainer {...defaultProps} loading />)

      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not render loader when loading is false', () => {
      render(<ChartContainer {...defaultProps} loading={false} />)

      expect(screen.queryByTestId('loader')).not.toBeInTheDocument()
    })

    it('hides footer-area while loading', () => {
      const { container } = render(
        <ChartContainer
          {...defaultProps}
          loading
          footer={<div data-testid="footer">Footer</div>}
        />,
      )

      expect(container.querySelector('.mdk-chart-container__footer-area')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('renders default empty message', () => {
      render(<ChartContainer {...defaultProps} empty />)

      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('renders custom empty message', () => {
      render(<ChartContainer {...defaultProps} empty emptyMessage="Nothing here" />)

      expect(screen.getByText('Nothing here')).toBeInTheDocument()
    })

    it('does not render children when empty', () => {
      render(<ChartContainer {...defaultProps} empty />)

      expect(screen.queryByTestId('chart-content')).not.toBeInTheDocument()
    })

    it('does not render empty message when loading', () => {
      render(<ChartContainer {...defaultProps} empty loading />)

      expect(screen.queryByText('No data available')).not.toBeInTheDocument()
    })

    it('hides footer-area when empty', () => {
      const { container } = render(
        <ChartContainer {...defaultProps} empty footer={<div data-testid="footer">Footer</div>} />,
      )

      expect(container.querySelector('.mdk-chart-container__footer-area')).not.toBeInTheDocument()
    })
  })
})
