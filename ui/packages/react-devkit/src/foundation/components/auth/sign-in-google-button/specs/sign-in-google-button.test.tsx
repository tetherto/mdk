import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SignInGoogleButton } from '../sign-in-google-button'

const installLocationMock = (): { getHref: () => string } => {
  let hrefValue = 'http://localhost/'
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      get href() {
        return hrefValue
      },
      set href(next: string) {
        hrefValue = next
      },
    },
  })
  return { getHref: () => hrefValue }
}

describe('SignInGoogleButton', () => {
  let originalLocation: Location

  beforeEach(() => {
    originalLocation = window.location
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  describe('rendering', () => {
    it('renders the default label when no override is provided', () => {
      render(<SignInGoogleButton oauthBaseUrl="http://api.test" />)

      expect(screen.getByRole('button', { name: /Sign in with Google/i })).toBeInTheDocument()
    })

    it('renders a custom label when provided', () => {
      render(<SignInGoogleButton oauthBaseUrl="http://api.test" label="Continue with Google" />)

      expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument()
    })

    it('renders the Google logo svg', () => {
      const { container } = render(<SignInGoogleButton oauthBaseUrl="http://api.test" />)

      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('click behaviour', () => {
    it('redirects to <oauthBaseUrl>/oauth/google on click', () => {
      const location = installLocationMock()
      render(<SignInGoogleButton oauthBaseUrl="http://api.test" />)

      fireEvent.click(screen.getByRole('button'))

      expect(location.getHref()).toBe('http://api.test/oauth/google')
    })

    it('trims trailing slashes from oauthBaseUrl before redirecting', () => {
      const location = installLocationMock()
      render(<SignInGoogleButton oauthBaseUrl="http://api.test///" />)

      fireEvent.click(screen.getByRole('button'))

      expect(location.getHref()).toBe('http://api.test/oauth/google')
    })

    it('invokes onClick override instead of redirecting when provided', () => {
      const location = installLocationMock()
      const handler = vi.fn()
      render(<SignInGoogleButton oauthBaseUrl="http://api.test" onClick={handler} />)

      fireEvent.click(screen.getByRole('button'))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(location.getHref()).toBe('http://localhost/')
    })
  })

  describe('ref forwarding', () => {
    it('forwards a ref to the underlying button', () => {
      const ref = { current: null as HTMLButtonElement | null }
      render(<SignInGoogleButton oauthBaseUrl="http://api.test" ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
  })
})
