import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onLogClicked } from '../../../../utils/alerts-utils'
import type { TimelineItemData } from '../alarm-row/alarm-row'
import { AlarmRow } from '../alarm-row/alarm-row'

vi.mock('../../../../constants/alerts', () => ({
  ALERT_SEVERITY_TYPES: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}))

vi.mock('../../../../utils/alerts-utils', () => ({
  onLogClicked: vi.fn(),
}))

const makeItem = (overrides = {}): TimelineItemData => ({
  item: {
    title: 'Test Alert',
    subtitle: 'Test Subtitle',
    body: 'Body part 1|Body part 2|Body part 3',
    uuid: 'uuid-123',
    status: 'critical',
    ...overrides,
  },
  dot: <span>dot</span>,
  children: <span>child</span>,
})

describe('AlarmRow', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the alarm row wrapper', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(container.querySelector('.mdk-alarm-row')).toBeInTheDocument()
    })

    it('renders the alarm container', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(container.querySelector('.mdk-alarm-row__container')).toBeInTheDocument()
    })

    it('renders the title', () => {
      render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(screen.getByText('Test Alert')).toBeInTheDocument()
    })

    it('renders the subtitle', () => {
      render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
    })

    it('renders body parts split by pipe', () => {
      render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(screen.getByText('Body part 1')).toBeInTheDocument()
      expect(screen.getByText('Body part 2')).toBeInTheDocument()
      expect(screen.getByText('Body part 3')).toBeInTheDocument()
    })

    it('renders single body part when no pipe separator', () => {
      render(<AlarmRow data={makeItem({ body: 'Single body' })} onNavigate={mockNavigate} />)
      expect(screen.getByText('Single body')).toBeInTheDocument()
    })

    it('renders empty body parts correctly', () => {
      render(<AlarmRow data={makeItem({ body: '' })} onNavigate={mockNavigate} />)
      const bodyEl = document.querySelector('.mdk-alarm-row__body')
      expect(bodyEl).toBeInTheDocument()
    })

    it('renders multiple body divs for each pipe-split section', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      const bodyDivs = container.querySelectorAll('.mdk-alarm-row__body > div')
      expect(bodyDivs).toHaveLength(3)
    })
  })

  describe('style and color', () => {
    it('applies --mdk-alarm-color css variable for critical status', () => {
      const { container } = render(
        <AlarmRow data={makeItem({ status: 'critical' })} onNavigate={mockNavigate} />,
      )
      const wrapper = container.querySelector('.mdk-alarm-row') as HTMLElement
      expect(wrapper.style.getPropertyValue('--mdk-alarm-color')).toBe(
        'var(--mdk-button-danger-bg)',
      )
    })

    it('applies --mdk-alarm-color css variable for high status', () => {
      const { container } = render(
        <AlarmRow data={makeItem({ status: 'high' })} onNavigate={mockNavigate} />,
      )
      const wrapper = container.querySelector('.mdk-alarm-row') as HTMLElement
      expect(wrapper.style.getPropertyValue('--mdk-alarm-color')).toBe('var(--mdk-color-primary)')
    })

    it('applies --mdk-alarm-color css variable for medium status', () => {
      const { container } = render(
        <AlarmRow data={makeItem({ status: 'medium' })} onNavigate={mockNavigate} />,
      )
      const wrapper = container.querySelector('.mdk-alarm-row') as HTMLElement
      expect(wrapper.style.getPropertyValue('--mdk-alarm-color')).toBe('var(--mdk-color-warning)')
    })

    it('applies undefined --mdk-alarm-color for unknown status', () => {
      const { container } = render(
        <AlarmRow data={makeItem({ status: 'unknown' })} onNavigate={mockNavigate} />,
      )
      const wrapper = container.querySelector('.mdk-alarm-row') as HTMLElement
      expect(wrapper.style.getPropertyValue('--mdk-alarm-color')).toBe('')
    })
  })

  describe('icon rendering', () => {
    it('renders high icon for high status', () => {
      render(<AlarmRow data={makeItem({ status: 'high' })} onNavigate={mockNavigate} />)
      const icon = screen.getByRole('img', { name: 'high' })
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('mdk-alarm-row__icon--high')
    })

    it('renders medium dot icon for medium status', () => {
      render(<AlarmRow data={makeItem({ status: 'medium' })} onNavigate={mockNavigate} />)
      const icon = screen.getByRole('img', { name: 'medium' })
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('mdk-alarm-row__icon--dot')
    })

    it('renders no icon for unknown status', () => {
      render(<AlarmRow data={makeItem({ status: 'unknown' })} onNavigate={mockNavigate} />)
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('renders icon inside title row', () => {
      const { container } = render(
        <AlarmRow data={makeItem({ status: 'critical' })} onNavigate={mockNavigate} />,
      )
      const titleRow = container.querySelector('.mdk-alarm-row__title-row')
      expect(titleRow?.querySelector('[role="img"]')).toBeInTheDocument()
    })
  })

  describe('click handling', () => {
    it('calls onLogClicked with navigate and uuid when container is clicked', () => {
      const { container } = render(
        <AlarmRow data={makeItem({ uuid: 'uuid-123' })} onNavigate={mockNavigate} />,
      )
      fireEvent.click(container.querySelector('.mdk-alarm-row__container')!)
      expect(onLogClicked).toHaveBeenCalledWith(mockNavigate, 'uuid-123')
    })

    it('calls onLogClicked with undefined uuid when uuid is not provided', () => {
      const { container } = render(
        <AlarmRow data={makeItem({ uuid: undefined })} onNavigate={mockNavigate} />,
      )
      fireEvent.click(container.querySelector('.mdk-alarm-row__container')!)
      expect(onLogClicked).toHaveBeenCalledWith(mockNavigate, undefined)
    })

    it('calls onLogClicked once per click', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      fireEvent.click(container.querySelector('.mdk-alarm-row__container')!)
      expect(onLogClicked).toHaveBeenCalledTimes(1)
    })

    it('calls onLogClicked multiple times for multiple clicks', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      const containerEl = container.querySelector('.mdk-alarm-row__container')!
      fireEvent.click(containerEl)
      fireEvent.click(containerEl)
      fireEvent.click(containerEl)
      expect(onLogClicked).toHaveBeenCalledTimes(3)
    })

    it('passes the onNavigate function reference to onLogClicked', () => {
      const customNavigate = vi.fn()
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={customNavigate} />)
      fireEvent.click(container.querySelector('.mdk-alarm-row__container')!)
      expect(onLogClicked).toHaveBeenCalledWith(customNavigate, expect.anything())
    })
  })

  describe('BEM class structure', () => {
    it('renders title row with correct class', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(container.querySelector('.mdk-alarm-row__title-row')).toBeInTheDocument()
    })

    it('renders title with correct class', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(container.querySelector('.mdk-alarm-row__title')).toBeInTheDocument()
    })

    it('renders subtitle with correct class', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(container.querySelector('.mdk-alarm-row__subtitle')).toBeInTheDocument()
    })

    it('renders body with correct class', () => {
      const { container } = render(<AlarmRow data={makeItem()} onNavigate={mockNavigate} />)
      expect(container.querySelector('.mdk-alarm-row__body')).toBeInTheDocument()
    })
  })
})
