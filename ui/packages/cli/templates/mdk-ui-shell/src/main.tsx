import { MdkProvider } from '@tetherto/mdk-react-adapter'
import { authStore, extractAuthTokenFromUrl, stripAuthTokenFromUrl } from '@tetherto/mdk-ui-foundation'
import React from 'react'

import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { API_BASE_URL } from './constants/env'
import { router } from './router'
import '@tetherto/mdk-fonts/jetbrains-mono.css'

import '@tetherto/mdk-react-devkit/styles.css'
import '@tetherto/mdk-react-devkit/styles-domain.css'
import './index.scss'

// --- OAuth callback bootstrap ------------------------------------------
// authStore's persist middleware already rehydrates the token from
// localStorage on import (see @tetherto/mdk-ui-foundation/store/auth-store) —
// the only thing we still need to do is capture a fresh `?authToken=`
// off the OAuth redirect and clean it out of the URL.
const urlToken = extractAuthTokenFromUrl(window.location.search)
if (urlToken !== null && urlToken !== '') {
  authStore.getState().setToken(urlToken)
  const cleaned = stripAuthTokenFromUrl(window.location.search)
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${cleaned}${window.location.hash}`,
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MdkProvider apiBaseUrl={API_BASE_URL}>
      <RouterProvider router={router} />
    </MdkProvider>
  </React.StrictMode>,
)
