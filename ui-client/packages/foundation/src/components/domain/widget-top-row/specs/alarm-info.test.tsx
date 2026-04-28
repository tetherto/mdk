import { SimpleTooltip } from '@tetherto/core'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimezone } from '../../../../hooks/use-timezone'
import type { Alert } from '../../../../types/alerts'
import { getAlertsDescription } from '../../../../utils/alerts-utils'
import { AlarmInfo } from '../alarm-info'

vi.mock('@tetherto/core', () => ({
  SimpleTooltip: vi.fn(({ content, children }) => (
    <div data-testid="tooltip">
      <div data-testid="tooltip-content">{content}</div>
      {children}
    </div>
  )),
}))

vi.mock('../../../../hooks/use-timezone', () => ({
  useTimezone: vi.fn(() => ({
    getFormattedDate: vi.fn((date) => date || '2024-01-15 10:30:00'),
  })),
}))

vi.mock('../../../../utils/alerts-utils', () => ({
  getAlertsDescription: vi.fn((alerts) => {
    if (alerts.length === 0) return ''
    if (alerts.length === 1) return `Alert: ${alerts[0].message}`
    return alerts.map((a: Alert) => `Alert: ${a.message}`).join('\n\n')
  }),
}))

describe('AlarmInfo', () => {
  const mockIcon = <svg data-testid="alarm-icon">Icon</svg>

  const mockAlerts: Alert[] = [
    {
      id: '1',
      type: 'temperature',
      message: 'High temperature detected',
      severity: 'critical',
      timestamp: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      type: 'power',
      message: 'Power threshold exceeded',
      severity: 'warning',
      timestamp: '2024-01-15T10:30:00Z',
    },
  ] as unknown as Alert[]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with items', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('alarm-icon')).toBeInTheDocument()
    })

    it('renders null when items is undefined', () => {
      const { container } = render(<AlarmInfo title="Temperature" icon={mockIcon} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders null when items is empty array', () => {
      const { container } = render(<AlarmInfo title="Temperature" icon={mockIcon} items={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders null when items is null', () => {
      const { container } = render(
        <AlarmInfo title="Temperature" icon={mockIcon} items={null as any} />,
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders icon inside tooltip', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      const tooltip = screen.getByTestId('tooltip')
      const icon = screen.getByTestId('alarm-icon')

      expect(tooltip).toContainElement(icon)
    })

    it('applies correct CSS class to icon wrapper', () => {
      const { container } = render(
        <AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />,
      )

      expect(container.querySelector('.mdk-widget-top-row__alarm-info-icon')).toBeInTheDocument()
    })
  })

  describe('tooltip content', () => {
    it('displays title with "issues" suffix', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      expect(screen.getByText('Temperature issues')).toBeInTheDocument()
    })

    it('applies correct CSS class to title', () => {
      const { container } = render(
        <AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />,
      )

      const title = container.querySelector('.mdk-widget-top-row__alarm-info-title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Temperature issues')
    })

    it('displays single alert description', () => {
      const singleAlert = [mockAlerts[0]]
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={singleAlert} />)

      expect(screen.getByText('Alert: High temperature detected')).toBeInTheDocument()
    })

    it('displays multiple alert descriptions', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      expect(screen.getByText('Alert: High temperature detected')).toBeInTheDocument()
      expect(screen.getByText('Alert: Power threshold exceeded')).toBeInTheDocument()
    })

    it('splits descriptions by double newline', () => {
      vi.mocked(getAlertsDescription).mockReturnValue('Line 1\n\nLine 2\n\nLine 3')

      render(<AlarmInfo title="Test" icon={mockIcon} items={mockAlerts} />)

      expect(screen.getByText('Line 1')).toBeInTheDocument()
      expect(screen.getByText('Line 2')).toBeInTheDocument()
      expect(screen.getByText('Line 3')).toBeInTheDocument()
    })

    it('handles single line description', () => {
      vi.mocked(getAlertsDescription).mockReturnValue('Single line')

      render(<AlarmInfo title="Test" icon={mockIcon} items={mockAlerts} />)

      expect(screen.getByText('Single line')).toBeInTheDocument()
    })

    it('handles empty string description', () => {
      vi.mocked(getAlertsDescription).mockReturnValue('')

      render(<AlarmInfo title="Test" icon={mockIcon} items={mockAlerts} />)

      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent).toBeInTheDocument()
    })
  })

  describe('hooks integration', () => {
    it('calls useTimezone hook', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      expect(useTimezone).toHaveBeenCalled()
    })

    it('calls getAlertsDescription with alerts and formatter', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      expect(getAlertsDescription).toHaveBeenCalledWith(mockAlerts, expect.any(Function))
    })

    it('passes getFormattedDate to getAlertsDescription', () => {
      const mockGetFormattedDate = vi.fn()
      vi.mocked(useTimezone).mockReturnValue({ getFormattedDate: mockGetFormattedDate })

      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      expect(getAlertsDescription).toHaveBeenCalledWith(mockAlerts, mockGetFormattedDate)
    })
  })

  describe('SimpleTooltip integration', () => {
    it('wraps content in SimpleTooltip', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      expect(SimpleTooltip).toHaveBeenCalled()
    })

    it('passes content prop to SimpleTooltip', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      const call = vi.mocked(SimpleTooltip).mock.calls[0]
      expect(call[0]).toHaveProperty('content')
    })

    it('passes children to SimpleTooltip', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      const call = vi.mocked(SimpleTooltip).mock.calls[0]
      expect(call[0]).toHaveProperty('children')
    })
  })

  describe('displayName', () => {
    it('has correct displayName', () => {
      expect(AlarmInfo.displayName).toBe('AlarmInfo')
    })
  })

  describe('accessibility', () => {
    it('renders semantic HTML structure', () => {
      const { container } = render(
        <AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />,
      )

      expect(container.querySelector('h4')).toBeInTheDocument()
      expect(container.querySelector('div')).toBeInTheDocument()
    })

    it('maintains heading hierarchy', () => {
      render(<AlarmInfo title="Temperature" icon={mockIcon} items={mockAlerts} />)

      const heading = screen.getByRole('heading', { level: 4 })
      expect(heading).toHaveTextContent('Temperature issues')
    })
  })
})
