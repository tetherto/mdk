import { Button, type ButtonProps } from '@primitives'
import { forwardRef, type JSX } from 'react'

const GoogleLogo = (): JSX.Element => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.64 9.205c0-.638-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.345 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.957H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.043l3.007-2.333z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.957L3.964 7.29C4.672 5.163 6.655 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
)

export type SignInGoogleButtonProps = Omit<ButtonProps, 'onClick' | 'children'> & {
  /**
   * Base URL of the OAuth backend (no trailing slash). Click navigates to
   * `${oauthBaseUrl}/oauth/google`.
   */
  oauthBaseUrl: string
  /** Override the visible button label. */
  label?: string
  /** Override the click behaviour entirely. When set, `oauthBaseUrl` is ignored. */
  onClick?: () => void
}

/**
 * One-click Google OAuth sign-in trigger. Defaults to a full-page redirect
 * to `${oauthBaseUrl}/oauth/google`, mirroring the production MOS flow.
 *
 * @category auth
 * @kernelCapability authentication
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <SignInGoogleButton oauthBaseUrl={import.meta.env.VITE_OAUTH_BASE_URL} />
 * ```
 * @tier agent-ready
 */
const SignInGoogleButton = forwardRef<HTMLButtonElement, SignInGoogleButtonProps>(
  ({ oauthBaseUrl, label = 'Sign in with Google', onClick, ...buttonProps }, ref) => {
    const handleClick = (): void => {
      if (onClick) return onClick()
      if (typeof window === 'undefined') return
      // Trim trailing slashes without a regex: an unanchored `/\/+$/` backtracks
      // polynomially (ReDoS) on long slash-heavy input; this linear scan does not.
      let end = oauthBaseUrl.length
      while (end > 0 && oauthBaseUrl.charAt(end - 1) === '/') end -= 1
      const trimmed = oauthBaseUrl.slice(0, end)
      window.location.href = `${trimmed}/oauth/google`
    }

    return (
      <Button
        ref={ref}
        type="button"
        variant="secondary"
        icon={<GoogleLogo />}
        iconPosition="left"
        onClick={handleClick}
        {...buttonProps}
      >
        {label}
      </Button>
    )
  },
)

SignInGoogleButton.displayName = 'SignInGoogleButton'

export { SignInGoogleButton }
