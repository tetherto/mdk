import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MinersActivityChart } from '../miners-activity-chart'

vi.mock('@tetherto/mdk-core-ui', () => ({
  CoreAlert: vi.fn(({ title, description }) => (
    <div data-testid="core-alert">
      <span data-testid="alert-title">{title}</span>
      <span data-testid="alert-description">{description}</span>
    </div>
  )),
  Spinner: vi.fn(() => <div data-testid="spinner" />),
  Indicator: vi.fn(({ children, color, size, vertical, className }) => (
    <div
      data-testid="indicator"
      data-color={color}
      data-size={size}
      data-vertical={String(vertical)}
      className={className}
    >
      {children}
    </div>
  )),
  SimpleTooltip: vi.fn(({ children, content }) => (
    <div data-testid="simple-tooltip" data-content={content}>
      {children}
    </div>
  )),
  formatNumber: vi.fn((value: number) => String(value)),
  cn: vi.fn((...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ')),
}))

vi.mock('../miners-activity-chart.const', () => {
  const ITEM_A = 'offline'
  const ITEM_B = 'error'
  const ITEM_C = 'normal'

  return {
    MINERS_ACTIVITY_ITEMS: {
      EXTENDED: {
        WOUT_MAINTENANCE: [ITEM_A, ITEM_B, ITEM_C],
      },
    },
    MINERS_ACTIVITY_LABELS: {
      [ITEM_A]: 'empty',
    },
    MINERS_ACTIVITY_TOOLTIPS: {
      [ITEM_B]: 'This does not include minor errors',
    },
    MinersActivityIndicatorColors: {
      [ITEM_A]: 'gray',
      [ITEM_B]: 'red',
      [ITEM_C]: 'green',
    },
  }
})

describe('MinersActivityChart', () => {
  describe('error state', () => {
    it('renders CoreAlert when isError is true and isDemoMode is false', () => {
      render(<MinersActivityChart isError />)

      expect(screen.getByTestId('core-alert')).toBeInTheDocument()
    })

    it('renders default error description when error has no message', () => {
      render(<MinersActivityChart isError />)

      expect(screen.getByTestId('alert-description')).toHaveTextContent(
        'Please try refreshing the page',
      )
    })

    it('renders error message from error prop when available', () => {
      render(<MinersActivityChart isError error={{ data: { message: 'Custom error' } }} />)

      expect(screen.getByTestId('alert-description')).toHaveTextContent('Custom error')
    })

    it('does not render CoreAlert when isError and isDemoMode are both true', () => {
      render(<MinersActivityChart isError isDemoMode />)

      expect(screen.queryByTestId('core-alert')).not.toBeInTheDocument()
    })

    it('does not render chart root when isError is true', () => {
      const { container } = render(<MinersActivityChart isError />)

      expect(container.querySelector('.mdk-miners-activity-chart__root')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders Spinner when isLoading is true', () => {
      render(<MinersActivityChart isLoading />)

      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('does not render chart root when isLoading is true', () => {
      const { container } = render(<MinersActivityChart isLoading />)

      expect(container.querySelector('.mdk-miners-activity-chart__root')).not.toBeInTheDocument()
    })

    it('isError takes precedence over isLoading', () => {
      render(<MinersActivityChart isError isLoading />)

      expect(screen.getByTestId('core-alert')).toBeInTheDocument()
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
    })
  })

  describe('chart rendering', () => {
    it('renders the chart root', () => {
      const { container } = render(<MinersActivityChart />)

      expect(container.querySelector('.mdk-miners-activity-chart__root')).toBeInTheDocument()
    })

    it('renders one Indicator per item', () => {
      render(<MinersActivityChart />)

      expect(screen.getAllByTestId('indicator')).toHaveLength(3)
    })
  })

  describe('Indicator props', () => {
    it('passes correct color from MinersActivityIndicatorColors', () => {
      render(<MinersActivityChart />)

      const indicators = screen.getAllByTestId('indicator')
      expect(indicators[0]).toHaveAttribute('data-color', 'gray')
      expect(indicators[1]).toHaveAttribute('data-color', 'red')
      expect(indicators[2]).toHaveAttribute('data-color', 'green')
    })

    it('passes size="sm" when large is false', () => {
      render(<MinersActivityChart large={false} />)

      screen.getAllByTestId('indicator').forEach((indicator) => {
        expect(indicator).toHaveAttribute('data-size', 'sm')
      })
    })

    it('passes size="lg" when large is true', () => {
      render(<MinersActivityChart large />)

      screen.getAllByTestId('indicator').forEach((indicator) => {
        expect(indicator).toHaveAttribute('data-size', 'lg')
      })
    })

    it('passes vertical prop to Indicator', () => {
      render(<MinersActivityChart />)

      screen.getAllByTestId('indicator').forEach((indicator) => {
        expect(indicator).toHaveAttribute('data-vertical', 'true')
      })
    })

    it('applies large class when large is true', () => {
      render(<MinersActivityChart large />)

      const indicators = screen.getAllByTestId('indicator')
      indicators.forEach((indicator) => {
        expect(indicator).toHaveClass('mdk-miners-activity-chart__item--large')
      })
    })

    it('does not apply large class when large is false', () => {
      render(<MinersActivityChart large={false} />)

      screen.getAllByTestId('indicator').forEach((indicator) => {
        expect(indicator).not.toHaveClass('mdk-miners-activity-chart__item--large')
      })
    })
  })

  describe('labels', () => {
    it('renders labels when showLabel is true', () => {
      render(<MinersActivityChart showLabel />)

      expect(screen.getAllByRole('generic').some((el) => el.tagName === 'SPAN')).toBe(true)
    })

    it('uses MINERS_ACTIVITY_LABELS override when available', () => {
      render(<MinersActivityChart showLabel />)

      expect(screen.getByText('empty')).toBeInTheDocument()
    })

    it('falls back to the raw value when no label override exists', () => {
      render(<MinersActivityChart showLabel />)

      expect(screen.getByText('normal')).toBeInTheDocument()
    })

    it('does not render label spans when showLabel is false', () => {
      render(<MinersActivityChart showLabel={false} />)

      expect(screen.queryByText('empty')).not.toBeInTheDocument()
      expect(screen.queryByText('normal')).not.toBeInTheDocument()
    })

    it('applies large label class when large is true', () => {
      const { container } = render(<MinersActivityChart showLabel large />)

      expect(
        container.querySelector('.mdk-miners-activity-chart__label--large'),
      ).toBeInTheDocument()
    })

    it('applies default label class when large is false', () => {
      const { container } = render(<MinersActivityChart showLabel large={false} />)

      expect(container.querySelector('.mdk-miners-activity-chart__label')).toBeInTheDocument()
    })
  })

  describe('values', () => {
    it('renders formatted value for each item', () => {
      render(<MinersActivityChart data={{ offline: 5, error: 2, normal: 10 }} />)

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('renders 0 for items missing from data', () => {
      render(<MinersActivityChart data={{}} />)

      expect(screen.getAllByText('0')).toHaveLength(3)
    })

    it('uses empty data when isError and isDemoMode are both true', () => {
      render(<MinersActivityChart isError isDemoMode data={{ offline: 5, error: 2, normal: 10 }} />)

      expect(screen.getAllByText('0')).toHaveLength(3)
    })
  })

  describe('tooltips', () => {
    it('wraps item with SimpleTooltip when tooltip exists', () => {
      render(<MinersActivityChart />)

      expect(screen.getByTestId('simple-tooltip')).toBeInTheDocument()
    })

    it('passes correct tooltip content to SimpleTooltip', () => {
      render(<MinersActivityChart />)

      expect(screen.getByTestId('simple-tooltip')).toHaveAttribute(
        'data-content',
        'This does not include minor errors',
      )
    })

    it('does not wrap items without tooltips in SimpleTooltip', () => {
      render(<MinersActivityChart />)

      // Only 1 of 3 items has a tooltip
      expect(screen.getAllByTestId('simple-tooltip')).toHaveLength(1)
    })
  })
})
