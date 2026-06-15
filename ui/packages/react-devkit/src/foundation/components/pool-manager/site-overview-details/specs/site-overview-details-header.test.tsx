import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SiteOverviewDetailsHeaderProps } from '../site-overview-details-header/site-overview-details-header'
import { SiteOverviewDetailsHeader } from '../site-overview-details-header/site-overview-details-header'

vi.mock('@core/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@core/index')>()
  return {
    ...actual,
    Button: vi.fn(({ children, onClick }) => <button onClick={onClick}>{children}</button>),
    Indicator: vi.fn(({ children, color, size }) => (
      <div data-testid="indicator" data-color={color} data-size={size}>
        {children}
      </div>
    )),
  }
})

const makeProps = (
  overrides: Partial<SiteOverviewDetailsHeaderProps> = {},
): SiteOverviewDetailsHeaderProps => ({
  poolName: 'Alpha Pool',
  actualMinersCount: 5,
  containerHashRate: '1.5 PH/s',
  isContainerRunning: true,
  hasSelection: false,
  onDeselectAll: vi.fn(),
  onSelectAll: vi.fn(),
  ...overrides,
})

const renderHeader = (overrides: Partial<SiteOverviewDetailsHeaderProps> = {}) =>
  render(<SiteOverviewDetailsHeader {...makeProps(overrides)} />)

describe('SiteOverviewDetailsHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the root wrapper', () => {
      const { container } = renderHeader()
      expect(container.querySelector('.mdk-sod-header')).toBeInTheDocument()
    })

    it('renders the info section', () => {
      const { container } = renderHeader()
      expect(container.querySelector('.mdk-sod-header__info')).toBeInTheDocument()
    })

    it('renders the actions section', () => {
      const { container } = renderHeader()
      expect(container.querySelector('.mdk-sod-header__actions')).toBeInTheDocument()
    })

    it('renders 4 info columns', () => {
      const { container } = renderHeader()
      expect(container.querySelectorAll('.mdk-sod-header__col')).toHaveLength(4)
    })
  })

  describe('pool info', () => {
    it('renders Pool label', () => {
      renderHeader()
      expect(screen.getByText('Pool')).toBeInTheDocument()
    })

    it('renders pool name value', () => {
      renderHeader({ poolName: 'Beta Pool' })
      expect(screen.getByText('Beta Pool')).toBeInTheDocument()
    })
  })

  describe('miners info', () => {
    it('renders Miners label', () => {
      renderHeader()
      expect(screen.getByText('Miners')).toBeInTheDocument()
    })

    it('renders actualMinersCount value', () => {
      renderHeader({ actualMinersCount: 42 })
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('applies active class when actualMinersCount > 0', () => {
      const { container } = renderHeader({ actualMinersCount: 3 })
      const values = container.querySelectorAll('.mdk-sod-header__value--active')
      expect(values).toHaveLength(1)
      expect(values[0]).toHaveTextContent('3')
    })

    it('does not apply active class when actualMinersCount is 0', () => {
      const { container } = renderHeader({ actualMinersCount: 0 })
      expect(container.querySelector('.mdk-sod-header__value--active')).not.toBeInTheDocument()
    })
  })

  describe('hashrate info', () => {
    it('renders Hashrate label', () => {
      renderHeader()
      expect(screen.getByText('Hashrate')).toBeInTheDocument()
    })

    it('renders containerHashRate value', () => {
      renderHeader({ containerHashRate: '2.8 PH/s' })
      expect(screen.getByText('2.8 PH/s')).toBeInTheDocument()
    })
  })

  describe('status indicator', () => {
    it('renders Status label', () => {
      renderHeader()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('renders Indicator component', () => {
      renderHeader()
      expect(screen.getByTestId('indicator')).toBeInTheDocument()
    })

    it('passes size="sm" to Indicator', () => {
      renderHeader()
      expect(screen.getByTestId('indicator').dataset.size).toBe('sm')
    })

    it('passes green color to Indicator when container is running', () => {
      renderHeader({ isContainerRunning: true })
      expect(screen.getByTestId('indicator').dataset.color).toBe('green')
    })

    it('passes gray color to Indicator when container is not running', () => {
      renderHeader({ isContainerRunning: false })
      expect(screen.getByTestId('indicator').dataset.color).toBe('gray')
    })

    it('shows "Online" label when container is running', () => {
      renderHeader({ isContainerRunning: true })
      expect(screen.getByTestId('indicator')).toHaveTextContent('Online')
    })

    it('shows "Offline" label when container is not running', () => {
      renderHeader({ isContainerRunning: false })
      expect(screen.getByTestId('indicator')).toHaveTextContent('Offline')
    })
  })

  describe('actions', () => {
    it('renders Select All button always', () => {
      renderHeader({ hasSelection: false })
      expect(screen.getByText('Select All')).toBeInTheDocument()
    })

    it('calls onSelectAll when Select All is clicked', () => {
      const onSelectAll = vi.fn()
      renderHeader({ onSelectAll })
      fireEvent.click(screen.getByText('Select All'))
      expect(onSelectAll).toHaveBeenCalledOnce()
    })

    it('does not render Deselect All when hasSelection is false', () => {
      renderHeader({ hasSelection: false })
      expect(screen.queryByText('Deselect All')).not.toBeInTheDocument()
    })

    it('renders Deselect All button when hasSelection is true', () => {
      renderHeader({ hasSelection: true })
      expect(screen.getByText('Deselect All')).toBeInTheDocument()
    })

    it('calls onDeselectAll when Deselect All is clicked', () => {
      const onDeselectAll = vi.fn()
      renderHeader({ hasSelection: true, onDeselectAll })
      fireEvent.click(screen.getByText('Deselect All'))
      expect(onDeselectAll).toHaveBeenCalledOnce()
    })
  })
})
