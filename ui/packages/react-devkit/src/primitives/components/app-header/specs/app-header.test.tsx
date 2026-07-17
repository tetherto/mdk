import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppHeader } from '../app-header'

describe('AppHeader', () => {
  describe('rendering', () => {
    it('renders a <header> element with the base class', () => {
      const { container } = render(<AppHeader />)

      const header = container.querySelector('header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('mdk-app-header')
    })

    it('always renders the main slot wrapper', () => {
      const { container } = render(<AppHeader />)

      expect(container.querySelector('.mdk-app-header__main')).toBeInTheDocument()
    })

    it('renders children inside the main slot', () => {
      render(
        <AppHeader>
          <span data-testid="main-content">stats</span>
        </AppHeader>,
      )

      const main = document.querySelector('.mdk-app-header__main')
      expect(main).toContainElement(screen.getByTestId('main-content'))
    })
  })

  describe('sticky modifier', () => {
    it('applies the sticky modifier by default', () => {
      const { container } = render(<AppHeader />)

      expect(container.querySelector('header')).toHaveClass('mdk-app-header--sticky')
    })

    it('omits the sticky modifier when sticky=false', () => {
      const { container } = render(<AppHeader sticky={false} />)

      expect(container.querySelector('header')).not.toHaveClass('mdk-app-header--sticky')
    })

    it('applies the sticky modifier when sticky=true is explicit', () => {
      const { container } = render(<AppHeader sticky />)

      expect(container.querySelector('header')).toHaveClass('mdk-app-header--sticky')
    })
  })

  describe('className', () => {
    it('merges a custom className with the base class', () => {
      const { container } = render(<AppHeader className="extra-class" />)

      const header = container.querySelector('header')
      expect(header).toHaveClass('mdk-app-header')
      expect(header).toHaveClass('extra-class')
    })

    it('renders without a custom className', () => {
      const { container } = render(<AppHeader />)

      const header = container.querySelector('header')
      expect(header?.className).not.toContain('undefined')
    })
  })

  describe('logo slot', () => {
    it('renders the logo wrapper when logo is provided', () => {
      render(<AppHeader logo={<span data-testid="logo">MDK</span>} />)

      const wrapper = document.querySelector('.mdk-app-header__logo')
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toContainElement(screen.getByTestId('logo'))
    })

    it('omits the logo wrapper when logo is not provided', () => {
      const { container } = render(<AppHeader />)

      expect(container.querySelector('.mdk-app-header__logo')).not.toBeInTheDocument()
    })

    it('omits the logo wrapper when logo is null', () => {
      const { container } = render(<AppHeader logo={null} />)

      expect(container.querySelector('.mdk-app-header__logo')).not.toBeInTheDocument()
    })
  })

  describe('start slot', () => {
    it('renders the start wrapper when start is provided', () => {
      render(<AppHeader start={<button type="button">menu</button>} />)

      const wrapper = document.querySelector('.mdk-app-header__start')
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toContainElement(screen.getByRole('button', { name: 'menu' }))
    })

    it('omits the start wrapper when start is not provided', () => {
      const { container } = render(<AppHeader />)

      expect(container.querySelector('.mdk-app-header__start')).not.toBeInTheDocument()
    })
  })

  describe('actions slot', () => {
    it('renders the actions wrapper when actions is provided', () => {
      render(<AppHeader actions={<button type="button">Sign out</button>} />)

      const wrapper = document.querySelector('.mdk-app-header__actions')
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toContainElement(screen.getByRole('button', { name: 'Sign out' }))
    })

    it('omits the actions wrapper when actions is not provided', () => {
      const { container } = render(<AppHeader />)

      expect(container.querySelector('.mdk-app-header__actions')).not.toBeInTheDocument()
    })
  })

  describe('all slots together', () => {
    it('renders logo, start, main, and actions wrappers when every slot is supplied', () => {
      const { container } = render(
        <AppHeader
          logo={<span>brand</span>}
          start={<button type="button">≡</button>}
          actions={<button type="button">profile</button>}
        >
          <span>content</span>
        </AppHeader>,
      )

      expect(container.querySelector('.mdk-app-header__logo')).toBeInTheDocument()
      expect(container.querySelector('.mdk-app-header__start')).toBeInTheDocument()
      expect(container.querySelector('.mdk-app-header__main')).toBeInTheDocument()
      expect(container.querySelector('.mdk-app-header__actions')).toBeInTheDocument()
    })
  })
})
