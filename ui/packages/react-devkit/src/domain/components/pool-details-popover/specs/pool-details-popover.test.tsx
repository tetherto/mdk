import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ReactNode } from 'react'
import { PoolDetailsPopover } from '../index'
import type { PoolDetailItem } from '../../pool-details-card'

vi.mock('@primitives', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives')>()
  return {
    ...actual,
    Dialog: ({ children }: { children: ReactNode }) => <div data-testid="dialog">{children}</div>,
    DialogTrigger: ({ children }: { children: ReactNode }) => (
      <div data-testid="dialog-trigger">{children}</div>
    ),
    DialogContent: ({
      children,
      title,
      description,
      closable,
      className,
    }: {
      children: ReactNode
      title?: string
      description?: string
      closable?: boolean
      className?: string
    }) => (
      <div
        data-testid="dialog-content"
        data-title={title ?? ''}
        data-description={description ?? ''}
        data-closable={closable ? 'true' : 'false'}
        className={className}
      >
        {children}
      </div>
    ),
    Button: ({
      children,
      disabled,
      variant,
      onClick,
    }: {
      children?: ReactNode
      disabled?: boolean
      variant?: string
      onClick?: () => void
    }) => (
      <button
        type="button"
        data-testid="trigger-button"
        data-variant={variant}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    ),
  }
})

const details: PoolDetailItem[] = [
  { title: 'URL', value: 'stratum+tcp://eu.example.pool:3333' },
  { title: 'Worker', value: 'rig-01' },
  { title: 'Fee', value: '1.5 %' },
]

describe('PoolDetailsPopover', () => {
  describe('rendering', () => {
    it('renders the wrapper with the base class', () => {
      const { container } = render(<PoolDetailsPopover details={details} />)

      expect(container.querySelector('.mdk-pool-details-popover')).toBeInTheDocument()
    })

    it('renders the Dialog, DialogTrigger and DialogContent slots', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })

    it('renders the trigger button with the secondary variant', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByTestId('trigger-button')).toHaveAttribute('data-variant', 'secondary')
    })

    it('forwards ref to the root element', () => {
      const ref = { current: null as HTMLDivElement | null }
      render(<PoolDetailsPopover ref={ref} details={details} />)

      expect(ref.current).not.toBeNull()
      expect(ref.current).toHaveClass('mdk-pool-details-popover')
    })

    it('forwards extra props to the root element', () => {
      const { container } = render(
        <PoolDetailsPopover details={details} data-testid="popover-root" />,
      )

      expect(container.querySelector('[data-testid="popover-root"]')).toBeInTheDocument()
    })

    it('exposes a stable displayName', () => {
      expect(PoolDetailsPopover.displayName).toBe('PoolDetailsPopover')
    })
  })

  describe('triggerLabel', () => {
    it('renders the provided triggerLabel text', () => {
      render(<PoolDetailsPopover details={details} triggerLabel="View pool" />)

      expect(screen.getByTestId('trigger-button').textContent).toBe('View pool')
    })

    it('renders an empty trigger button when triggerLabel is omitted', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByTestId('trigger-button').textContent).toBe('')
    })
  })

  describe('disabled', () => {
    it('does not disable the trigger by default', () => {
      render(<PoolDetailsPopover details={details} triggerLabel="View pool" />)

      expect(screen.getByTestId('trigger-button')).not.toBeDisabled()
    })

    it('does not disable the trigger when disabled=false', () => {
      render(<PoolDetailsPopover details={details} triggerLabel="View pool" disabled={false} />)

      expect(screen.getByTestId('trigger-button')).not.toBeDisabled()
    })

    it('disables the trigger when disabled=true', () => {
      render(<PoolDetailsPopover details={details} triggerLabel="View pool" disabled />)

      expect(screen.getByTestId('trigger-button')).toBeDisabled()
    })

    it('does not fire click when the trigger is disabled', () => {
      const onClick = vi.fn()
      render(
        <PoolDetailsPopover
          details={details}
          triggerLabel="View pool"
          disabled
          onClick={onClick}
        />,
      )

      fireEvent.click(screen.getByTestId('trigger-button'))
      // disabled native buttons swallow clicks
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('DialogContent passthroughs', () => {
    it('passes title to DialogContent', () => {
      render(<PoolDetailsPopover details={details} title="Pool details" />)

      expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-title', 'Pool details')
    })

    it('renders DialogContent with an empty title when title is omitted', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-title', '')
    })

    it('passes description to DialogContent when provided', () => {
      render(<PoolDetailsPopover details={details} description="Detailed info" />)

      expect(screen.getByTestId('dialog-content')).toHaveAttribute(
        'data-description',
        'Detailed info',
      )
    })

    it('renders DialogContent with an empty description when description is omitted', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-description', '')
    })

    it('always passes closable=true to DialogContent', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-closable', 'true')
    })

    it('applies the popover-content className to DialogContent', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByTestId('dialog-content')).toHaveClass('mdk-pool-details-popover-content')
    })
  })

  describe('className', () => {
    it('merges a custom className alongside the base class', () => {
      const { container } = render(<PoolDetailsPopover details={details} className="extra" />)

      const root = container.querySelector('.mdk-pool-details-popover')
      expect(root).toHaveClass('extra')
    })

    it('renders cleanly without a className', () => {
      const { container } = render(<PoolDetailsPopover details={details} />)

      const root = container.querySelector('.mdk-pool-details-popover')
      expect(root?.className).not.toContain('undefined')
    })
  })

  describe('popover body / embedded PoolDetailsCard', () => {
    it('renders the popover body wrapper inside DialogContent', () => {
      const { container } = render(<PoolDetailsPopover details={details} />)

      expect(container.querySelector('.mdk-pool-details-popover-content__body')).toBeInTheDocument()
    })

    it('renders the embedded PoolDetailsCard with each detail row', () => {
      render(<PoolDetailsPopover details={details} />)

      expect(screen.getByText('URL:')).toBeInTheDocument()
      expect(screen.getByText('stratum+tcp://eu.example.pool:3333')).toBeInTheDocument()
      expect(screen.getByText('Worker:')).toBeInTheDocument()
      expect(screen.getByText('rig-01')).toBeInTheDocument()
    })

    it('renders the empty-state placeholder when details is empty', () => {
      render(<PoolDetailsPopover details={[]} />)

      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })
})
