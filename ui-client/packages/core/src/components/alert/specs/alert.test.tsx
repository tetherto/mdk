import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '../index'

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

describe('Alert', () => {
  describe('rendering', () => {
    it('renders the wrapper with role="alert"', () => {
      render(<Alert />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('renders the wrapper with base class', () => {
      const { container } = render(<Alert />)

      expect(container.querySelector('.mdk-alert')).toBeInTheDocument()
    })

    it('sets displayName', () => {
      expect(Alert.displayName).toBe('Alert')
    })

    it('forwards ref to the wrapper div', () => {
      const ref = { current: null }
      render(<Alert ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('applies custom className', () => {
      const { container } = render(<Alert className="custom" />)

      expect(container.querySelector('.custom')).toBeInTheDocument()
    })

    it('passes extra div props through', () => {
      render(<Alert data-testid="my-alert" />)

      expect(screen.getByTestId('my-alert')).toBeInTheDocument()
    })
  })

  describe('type', () => {
    it('applies info class by default', () => {
      const { container } = render(<Alert />)

      expect(container.querySelector('.mdk-alert--info')).toBeInTheDocument()
    })

    it.each(['success', 'info', 'warning', 'error'] as const)(
      'applies correct class for type "%s"',
      (type) => {
        const { container } = render(<Alert type={type} />)

        expect(container.querySelector(`.mdk-alert--${type}`)).toBeInTheDocument()
      },
    )
  })

  describe('title', () => {
    it('renders the title text', () => {
      render(<Alert title="Success Text" />)

      expect(screen.getByText('Success Text')).toBeInTheDocument()
    })

    it('renders title as ReactNode', () => {
      render(<Alert title={<strong data-testid="title-node">Bold</strong>} />)

      expect(screen.getByTestId('title-node')).toBeInTheDocument()
    })

    it('does not render title element when not provided', () => {
      const { container } = render(<Alert />)

      expect(container.querySelector('.mdk-alert__title')).not.toBeInTheDocument()
    })
  })

  describe('description', () => {
    it('renders description text', () => {
      render(<Alert description="Some info" />)

      expect(screen.getByText('Some info')).toBeInTheDocument()
    })

    it('renders description as ReactNode', () => {
      render(<Alert description={<p data-testid="desc-node">Details</p>} />)

      expect(screen.getByTestId('desc-node')).toBeInTheDocument()
    })

    it('does not render description element when not provided', () => {
      const { container } = render(<Alert />)

      expect(container.querySelector('.mdk-alert__description')).not.toBeInTheDocument()
    })

    it('applies with-description class when description is provided', () => {
      const { container } = render(<Alert description="desc" />)

      expect(container.querySelector('.mdk-alert--with-description')).toBeInTheDocument()
    })

    it('does not apply with-description class without description', () => {
      const { container } = render(<Alert title="title" />)

      expect(container.querySelector('.mdk-alert--with-description')).not.toBeInTheDocument()
    })
  })

  describe('icon', () => {
    it('does not render icon by default', () => {
      const { container } = render(<Alert />)

      expect(container.querySelector('.mdk-alert__icon')).not.toBeInTheDocument()
    })

    it('renders icon slot when showIcon is true', () => {
      const { container } = render(<Alert showIcon />)

      expect(container.querySelector('.mdk-alert__icon')).toBeInTheDocument()
    })

    it('renders built-in SVG icon when showIcon is true and no custom icon', () => {
      const { container } = render(<Alert showIcon type="success" />)

      expect(container.querySelector('.mdk-alert__icon svg')).toBeInTheDocument()
    })

    it('renders custom icon when provided', () => {
      render(<Alert showIcon icon={<span data-testid="custom-icon" />} />)

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('renders correct icon for each type', () => {
      const types = ['success', 'info', 'warning', 'error'] as const
      types.forEach((type) => {
        const { container, unmount } = render(<Alert showIcon type={type} />)
        expect(container.querySelector('.mdk-alert__icon svg')).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('closable', () => {
    it('does not render close button by default', () => {
      render(<Alert />)

      expect(screen.queryByRole('button', { name: 'close' })).not.toBeInTheDocument()
    })

    it('renders close button when closable is true', () => {
      render(<Alert closable />)

      expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument()
    })

    it('hides the alert after close button is clicked', () => {
      render(<Alert closable title="Closable Alert" />)

      fireEvent.click(screen.getByRole('button', { name: 'close' }))

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<Alert closable onClose={onClose} />)

      fireEvent.click(screen.getByRole('button', { name: 'close' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('close button has type="button"', () => {
      render(<Alert closable />)

      expect(screen.getByRole('button', { name: 'close' })).toHaveAttribute('type', 'button')
    })
  })

  describe('banner', () => {
    it('does not apply banner class by default', () => {
      const { container } = render(<Alert />)

      expect(container.querySelector('.mdk-alert--banner')).not.toBeInTheDocument()
    })

    it('applies banner class when banner is true', () => {
      const { container } = render(<Alert banner />)

      expect(container.querySelector('.mdk-alert--banner')).toBeInTheDocument()
    })
  })

  describe('action', () => {
    it('does not render action slot when not provided', () => {
      const { container } = render(<Alert />)

      expect(container.querySelector('.mdk-alert__action')).not.toBeInTheDocument()
    })

    it('renders action content', () => {
      render(<Alert action={<button type="button">UNDO</button>} />)

      expect(screen.getByRole('button', { name: 'UNDO' })).toBeInTheDocument()
    })

    it('renders action as ReactNode', () => {
      render(<Alert action={<span data-testid="action-node">Action</span>} />)

      expect(screen.getByTestId('action-node')).toBeInTheDocument()
    })
  })
})
