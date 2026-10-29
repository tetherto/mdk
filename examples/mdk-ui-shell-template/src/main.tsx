// First: fixes the cascade layer order before any stylesheet mentions a layer.
import './layers.css'
import { MdkProvider } from '@tetherto/mdk-react-adapter'
import { authStore } from '@tetherto/mdk-ui-foundation'
import React from 'react'

import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { auth, passwordSession } from './auth'
import { API_BASE_URL, APP_NAME, AUTH_BYPASS } from './constants/env'
import { router } from './router'
import './fonts.css'

import '@tetherto/mdk-react-devkit/styles.css'
import '@tetherto/mdk-react-devkit/styles-domain.css'
import '@tetherto/mdk-ui-agent/styles.css'
import './index.scss'

document.title = APP_NAME

// --- Session: see ./auth.ts ------------------------------------------

// Dev-only auth bypass: when there's no OAuth redirect to capture, seed a stub
// token so token-reading components render and the router's guard (see
// ./router.tsx) passes without a real OAuth backend. `auth.bootstrap()` — run
// inside `MdkProvider` below — still wins over this if a real `?authToken=` is
// on the URL. Token-refresh polling for this stub session is separately
// disabled in `App.tsx`. Never enabled in production.
if (AUTH_BYPASS && authStore.getState().token == null) {
  authStore.getState().setToken('dev-auth-bypass')
}

const render = () =>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MdkProvider apiBaseUrl={API_BASE_URL} auth={auth} fetcher={passwordSession?.fetcher}>
        <RouterProvider router={router} />
      </MdkProvider>
    </React.StrictMode>,
  )

// A password session survives a reload through its refresh cookie: restore it
// before the router's guard looks for a token, or every reload lands on /signin.
if (passwordSession && !AUTH_BYPASS) void passwordSession.restore().finally(render)
else render()
