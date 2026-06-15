import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Divider } from '../index'

describe('Divider', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Divider />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('has correct displayName', () => {
      expect(Divider.displayName).toBe('Divider')
    })

    it('forwards ref to the root element', () => {
      const ref = { current: null }
      render(<Divider ref={ref} />)
      expect(ref.current).not.toBeNull()
    })

    it('forwards extra props to the root element', () => {
      const { container } = render(<Divider data-testid="my-divider" />)
      expect(container.querySelector('[data-testid="my-divider"]')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<Divider className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('orientation', () => {
    it('defaults to horizontal', () => {
      const { container } = render(<Divider />)
      expect(container.firstChild).toHaveClass('mdk-divider--horizontal')
    })

    it('applies horizontal class when orientation="horizontal"', () => {
      const { container } = render(<Divider orientation="horizontal" />)
      expect(container.firstChild).toHaveClass('mdk-divider--horizontal')
    })

    it('applies vertical class when orientation="vertical"', () => {
      const { container } = render(<Divider orientation="vertical" />)
      expect(container.firstChild).toHaveClass('mdk-divider--vertical')
    })

    it('sets aria orientation attribute for horizontal', () => {
      const { container } = render(<Divider orientation="horizontal" />)
      expect(container.firstChild).toHaveAttribute('data-orientation', 'horizontal')
    })

    it('sets aria orientation attribute for vertical', () => {
      const { container } = render(<Divider orientation="vertical" />)
      expect(container.firstChild).toHaveAttribute('data-orientation', 'vertical')
    })
  })

  describe('line type', () => {
    it('defaults to solid', () => {
      const { container } = render(<Divider />)
      expect(container.firstChild).toHaveClass('mdk-divider--solid')
    })

    it('applies dashed class when dashed=true', () => {
      const { container } = render(<Divider dashed />)
      expect(container.firstChild).toHaveClass('mdk-divider--dashed')
    })

    it('applies dotted class when dotted=true', () => {
      const { container } = render(<Divider dotted />)
      expect(container.firstChild).toHaveClass('mdk-divider--dotted')
    })

    it('dotted takes priority over dashed when both are true', () => {
      const { container } = render(<Divider dashed dotted />)
      expect(container.firstChild).toHaveClass('mdk-divider--dotted')
      expect(container.firstChild).not.toHaveClass('mdk-divider--dashed')
    })

    it('does not apply dashed class when dashed=false', () => {
      const { container } = render(<Divider dashed={false} />)
      expect(container.firstChild).not.toHaveClass('mdk-divider--dashed')
    })

    it('does not apply dotted class when dotted=false', () => {
      const { container } = render(<Divider dotted={false} />)
      expect(container.firstChild).not.toHaveClass('mdk-divider--dotted')
    })
  })

  describe('label', () => {
    it('renders label text when children provided with horizontal orientation', () => {
      render(<Divider>Section</Divider>)
      expect(screen.getByText('Section')).toBeInTheDocument()
    })

    it('wraps label in mdk-divider__label span', () => {
      const { container } = render(<Divider>My Label</Divider>)
      expect(container.querySelector('.mdk-divider__label')).toBeInTheDocument()
    })

    it('applies mdk-divider--with-label class when children present', () => {
      const { container } = render(<Divider>Label</Divider>)
      expect(container.firstChild).toHaveClass('mdk-divider--with-label')
    })

    it('does not render label when no children', () => {
      const { container } = render(<Divider />)
      expect(container.querySelector('.mdk-divider__label')).not.toBeInTheDocument()
    })

    it('does not render label for vertical orientation even when children provided', () => {
      const { container } = render(<Divider orientation="vertical">Label</Divider>)
      expect(container.querySelector('.mdk-divider__label')).not.toBeInTheDocument()
    })

    it('does not apply with-label class for vertical orientation', () => {
      const { container } = render(<Divider orientation="vertical">Label</Divider>)
      expect(container.firstChild).not.toHaveClass('mdk-divider--with-label')
    })

    it('renders ReactNode children in label', () => {
      render(
        <Divider>
          <span data-testid="custom-node">Custom</span>
        </Divider>,
      )
      expect(screen.getByTestId('custom-node')).toBeInTheDocument()
    })
  })

  describe('label alignment', () => {
    it('defaults to center alignment', () => {
      const { container } = render(<Divider>Label</Divider>)
      expect(container.firstChild).toHaveClass('mdk-divider--label-center')
    })

    it('applies label-left class when align="left"', () => {
      const { container } = render(<Divider align="left">Label</Divider>)
      expect(container.firstChild).toHaveClass('mdk-divider--label-left')
    })

    it('applies label-center class when align="center"', () => {
      const { container } = render(<Divider align="center">Label</Divider>)
      expect(container.firstChild).toHaveClass('mdk-divider--label-center')
    })

    it('applies label-right class when align="right"', () => {
      const { container } = render(<Divider align="right">Label</Divider>)
      expect(container.firstChild).toHaveClass('mdk-divider--label-right')
    })

    it('does not apply label alignment classes when no children', () => {
      const { container } = render(<Divider align="left" />)
      expect(container.firstChild).not.toHaveClass('mdk-divider--label-left')
    })
  })

  describe('plain', () => {
    it('does not apply plain class by default', () => {
      const { container } = render(<Divider />)
      expect(container.firstChild).not.toHaveClass('mdk-divider--plain')
    })

    it('applies plain class when plain=true', () => {
      const { container } = render(<Divider plain>Label</Divider>)
      expect(container.firstChild).toHaveClass('mdk-divider--plain')
    })

    it('does not apply plain class when plain=false', () => {
      const { container } = render(<Divider plain={false}>Label</Divider>)
      expect(container.firstChild).not.toHaveClass('mdk-divider--plain')
    })
  })

  describe('base class', () => {
    it('always has mdk-divider base class', () => {
      const { container } = render(<Divider />)
      expect(container.firstChild).toHaveClass('mdk-divider')
    })

    it('has mdk-divider base class with all variant combinations', () => {
      const { container } = render(<Divider orientation="vertical" dashed plain />)
      expect(container.firstChild).toHaveClass('mdk-divider')
    })
  })

  describe('combined variants', () => {
    it('renders horizontal dashed divider with centered label', () => {
      const { container } = render(
        <Divider dashed align="center">
          OR
        </Divider>,
      )
      const el = container.firstChild
      expect(el).toHaveClass('mdk-divider--horizontal')
      expect(el).toHaveClass('mdk-divider--dashed')
      expect(el).toHaveClass('mdk-divider--with-label')
      expect(el).toHaveClass('mdk-divider--label-center')
    })

    it('renders vertical solid divider without label', () => {
      const { container } = render(<Divider orientation="vertical" />)
      const el = container.firstChild
      expect(el).toHaveClass('mdk-divider--vertical')
      expect(el).toHaveClass('mdk-divider--solid')
      expect(el).not.toHaveClass('mdk-divider--with-label')
    })

    it('renders plain left-aligned dotted divider', () => {
      const { container } = render(
        <Divider dotted align="left" plain>
          Note
        </Divider>,
      )
      const el = container.firstChild
      expect(el).toHaveClass('mdk-divider--dotted')
      expect(el).toHaveClass('mdk-divider--label-left')
      expect(el).toHaveClass('mdk-divider--plain')
    })
  })
})
