import { useAuthToken } from '@tetherto/mdk-react-adapter'
import { consumeLastVisitedPath, SignInGoogleButton } from '@tetherto/mdk-react-devkit'
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { OAUTH_BASE_URL } from '../constants/env'
import { ROUTE_PATHS } from '../constants/routes'

const ERROR_MESSAGES: Record<string, string> = {
  ERR_AUTH_FAIL: 'Authentication failed. Please contact your administrator.',
}

const SignIn = () => {
  const token = useAuthToken()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const errorCode = params.get('error')

  useEffect(() => {
    if (token === null || token.length === 0) return
    const next = consumeLastVisitedPath() ?? ROUTE_PATHS.DASHBOARD
    void navigate(next, { replace: true })
  }, [token, navigate])

  return (
    <div className="mdk-ui-shell-signin">
      <a className="mdk-ui-shell-signin__brand" href="/" aria-label="Home">
        <svg
          className="mdk-ui-shell-signin__wordmark"
          viewBox="0 0 500 112"
          role="img"
          aria-label="MDK"
        >
          <title>MDK</title>
          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fontWeight="800"
            fontSize="96"
            letterSpacing="6"
            fill="currentColor"
          >
            MDK
          </text>
        </svg>
        <span className="mdk-ui-shell-signin__appname">{'{{appName}}'}</span>
      </a>

      <h1 className="mdk-ui-shell-signin__title">Sign in</h1>

      <SignInGoogleButton className="mdk-ui-shell-signin__cta" oauthBaseUrl={OAUTH_BASE_URL} />

      {errorCode !== null ? (
        <p className="mdk-ui-shell-signin__error">
          {ERROR_MESSAGES[errorCode] ?? 'Error occurred.'}
        </p>
      ) : null}
    </div>
  )
}

export default SignIn
