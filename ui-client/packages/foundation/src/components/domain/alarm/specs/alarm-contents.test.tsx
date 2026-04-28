import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AlarmContents } from '../alarm-contents/alarm-contents'
import type { TimelineItemData } from '../alarm-row/alarm-row'
import { AlarmRow } from '../alarm-row/alarm-row'

vi.mock('@tetherto/core', () => ({
  EmptyState: vi.fn(({ description, size }) => (
    <div data-testid="empty-state" data-size={size}>
      {description}
    </div>
  )),
}))

vi.mock('../alarm-row/alarm-row', () => ({
  AlarmRow: vi.fn(({ data, onNavigate }) => (
    <div data-testid="alarm-row" data-uuid={data.item.uuid} data-navigate={String(!!onNavigate)} />
  )),
}))

const makeTimelineItem = (overrides = {}): TimelineItemData => ({
  item: {
    title: 'Test Alert',
    subtitle: 'Test Subtitle',
    body: 'Body',
    uuid: 'uuid-001',
    status: 'critical',
    ...overrides,
  },
  dot: <span>dot</span>,
  children: <span>child</span>,
})

describe('AlarmContents', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state', () => {
    it('renders EmptyState when alarmsData is undefined', () => {
      render(<AlarmContents alarmsData={undefined} onNavigate={mockNavigate} />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('renders EmptyState when alarmsData is null', () => {
      render(<AlarmContents alarmsData={null} onNavigate={mockNavigate} />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('renders EmptyState when alarmsData is an empty array', () => {
      render(<AlarmContents alarmsData={[]} onNavigate={mockNavigate} />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('renders EmptyState with correct description', () => {
      render(<AlarmContents alarmsData={[]} onNavigate={mockNavigate} />)
      expect(screen.getByTestId('empty-state')).toHaveTextContent('No active alarm or event')
    })

    it('renders EmptyState with size sm', () => {
      render(<AlarmContents alarmsData={[]} onNavigate={mockNavigate} />)
      expect(screen.getByTestId('empty-state')).toHaveAttribute('data-size', 'sm')
    })

    it('does not render alarm list when empty', () => {
      const { container } = render(<AlarmContents alarmsData={[]} onNavigate={mockNavigate} />)
      expect(container.querySelector('.mdk-alarm-contents')).not.toBeInTheDocument()
    })
  })

  describe('alarm list', () => {
    it('renders alarm list container when alarmsData has items', () => {
      const { container } = render(
        <AlarmContents alarmsData={[makeTimelineItem()]} onNavigate={mockNavigate} />,
      )
      expect(container.querySelector('.mdk-alarm-contents')).toBeInTheDocument()
    })

    it('renders alarm list wrapper with correct class', () => {
      const { container } = render(
        <AlarmContents alarmsData={[makeTimelineItem()]} onNavigate={mockNavigate} />,
      )
      expect(container.querySelector('.mdk-alarm-contents__list')).toBeInTheDocument()
    })

    it('renders one AlarmRow per item', () => {
      const items = [makeTimelineItem({ uuid: 'uuid-1' }), makeTimelineItem({ uuid: 'uuid-2' })]
      render(<AlarmContents alarmsData={items} onNavigate={mockNavigate} />)
      expect(screen.getAllByTestId('alarm-row')).toHaveLength(2)
    })

    it('renders correct number of AlarmRows for single item', () => {
      render(<AlarmContents alarmsData={[makeTimelineItem()]} onNavigate={mockNavigate} />)
      expect(screen.getAllByTestId('alarm-row')).toHaveLength(1)
    })

    it('renders correct number of AlarmRows for multiple items', () => {
      const items = Array.from({ length: 5 }, (_, i) => makeTimelineItem({ uuid: `uuid-${i}` }))
      render(<AlarmContents alarmsData={items} onNavigate={mockNavigate} />)
      expect(screen.getAllByTestId('alarm-row')).toHaveLength(5)
    })

    it('passes correct data to each AlarmRow', () => {
      const items = [makeTimelineItem({ uuid: 'uuid-1' }), makeTimelineItem({ uuid: 'uuid-2' })]
      render(<AlarmContents alarmsData={items} onNavigate={mockNavigate} />)
      const rows = screen.getAllByTestId('alarm-row')
      expect(rows[0]).toHaveAttribute('data-uuid', 'uuid-1')
      expect(rows[1]).toHaveAttribute('data-uuid', 'uuid-2')
    })

    it('passes onNavigate to each AlarmRow', () => {
      const items = [makeTimelineItem(), makeTimelineItem({ uuid: 'uuid-2' })]
      render(<AlarmContents alarmsData={items} onNavigate={mockNavigate} />)
      screen.getAllByTestId('alarm-row').forEach((row) => {
        expect(row).toHaveAttribute('data-navigate', 'true')
      })
    })

    it('does not render EmptyState when alarmsData has items', () => {
      render(<AlarmContents alarmsData={[makeTimelineItem()]} onNavigate={mockNavigate} />)
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })

  describe('fallback rendering', () => {
    it('renders fallback container for non-array truthy alarmsData', () => {
      const { container } = render(
        <AlarmContents alarmsData="some string value" onNavigate={mockNavigate} />,
      )
      expect(container.querySelector('.mdk-alarm-contents__fallback')).toBeInTheDocument()
    })

    it('renders fallback content for string alarmsData', () => {
      render(<AlarmContents alarmsData="custom content" onNavigate={mockNavigate} />)
      expect(screen.getByText('custom content')).toBeInTheDocument()
    })

    it('renders fallback content for ReactNode alarmsData', () => {
      render(
        <AlarmContents
          alarmsData={<span data-testid="custom-node">Custom Node</span>}
          onNavigate={mockNavigate}
        />,
      )
      expect(screen.getByTestId('custom-node')).toBeInTheDocument()
    })

    it('does not render EmptyState for non-array truthy alarmsData', () => {
      render(<AlarmContents alarmsData="some value" onNavigate={mockNavigate} />)
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('does not render alarm list for non-array alarmsData', () => {
      const { container } = render(
        <AlarmContents alarmsData="some value" onNavigate={mockNavigate} />,
      )
      expect(container.querySelector('.mdk-alarm-contents')).not.toBeInTheDocument()
    })

    it('renders fallback for object alarmsData', () => {
      const customNode = <div data-testid="object-node">Object Content</div>
      render(<AlarmContents alarmsData={customNode} onNavigate={mockNavigate} />)
      expect(screen.getByTestId('object-node')).toBeInTheDocument()
    })
  })

  describe('AlarmRow mock calls', () => {
    it('calls AlarmRow with correct props', () => {
      const item = makeTimelineItem({ uuid: 'uuid-test' })
      render(<AlarmContents alarmsData={[item]} onNavigate={mockNavigate} />)
      expect(AlarmRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: item,
          onNavigate: mockNavigate,
        }),
        expect.anything(),
      )
    })

    it('calls AlarmRow once per item', () => {
      const items = [makeTimelineItem(), makeTimelineItem({ uuid: 'uuid-2' })]
      render(<AlarmContents alarmsData={items} onNavigate={mockNavigate} />)
      expect(AlarmRow).toHaveBeenCalledTimes(2)
    })
  })
})
