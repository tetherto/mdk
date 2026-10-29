import type {FormEvent} from 'react';
import { useAuthToken } from '@tetherto/mdk-react-adapter'
import { consumeLastVisitedPath, SignInGoogleButton } from '@tetherto/mdk-react-devkit'
import { MdkFetchError } from '@tetherto/mdk-ui-foundation'
import {  useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { passwordSession } from '../auth'
import { OAUTH_BASE_URL } from '../constants/env'
import { ROUTE_PATHS } from '../constants/routes'

const ERROR_MESSAGES: Record<string, string> = {
  ERR_AUTH_FAIL: 'Authentication failed. Please contact your administrator.',
}

const PASSWORD_ERRORS: Record<number, string> = {
  401: 'Wrong user name or password.',
  429: 'Too many attempts. Try again shortly.',
}

/** User name and password, checked by the Gateway through the Kernel's token issuer. */
const PasswordForm = ({ onError }: { onError: (message: string | null) => void }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!passwordSession) return
    setBusy(true)
    onError(null)
    try {
      await passwordSession.signInWithPassword({ username, password })
    } catch (error) {
      const status = error instanceof MdkFetchError ? error.status : 0
      onError(PASSWORD_ERRORS[status] ?? 'Sign-in is unavailable. Try again later.')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mdk-ui-shell-signin__form" onSubmit={(event) => void submit(event)}>
      <input
        className="mdk-ui-shell-signin__input"
        name="username"
        autoComplete="username"
        placeholder="User name"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        required
      />
      <input
        className="mdk-ui-shell-signin__input"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <button className="mdk-ui-shell-signin__cta" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

const SignIn = () => {
  const token = useAuthToken()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const errorCode = params.get('error')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (token === null || token.length === 0) return
    const next = consumeLastVisitedPath() ?? ROUTE_PATHS.HOME
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
        <span className="mdk-ui-shell-signin__appname">UI Shell</span>
      </a>

      <h1 className="mdk-ui-shell-signin__title">Sign in</h1>

      {passwordSession ? (
        <PasswordForm onError={setFormError} />
      ) : (
        <SignInGoogleButton className="mdk-ui-shell-signin__cta" oauthBaseUrl={OAUTH_BASE_URL} />
      )}

      {formError !== null ? <p className="mdk-ui-shell-signin__error">{formError}</p> : null}
      {errorCode !== null ? (
        <p className="mdk-ui-shell-signin__error">
          {ERROR_MESSAGES[errorCode] ?? 'Error occurred.'}
        </p>
      ) : null}
    </div>
  )
}

export default SignIn
