import '@tetherto/mdk-fonts/jetbrains-mono.css'
import '@tetherto/mdk-react-devkit/styles.css'
import { MdkProvider } from '@tetherto/mdk-react-adapter'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { SiteHashratePage } from './SiteHashratePage'

// In dev: Vite proxies /oauth/* and /kernel/* to gateway — use same origin (empty string).
// In production: UI is served by gateway as static files — also same origin.
// Override with VITE_API_BASE_URL only when deploying UI and API to separate hosts.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <MdkProvider apiBaseUrl={apiBaseUrl}>
      <SiteHashratePage />
    </MdkProvider>
  </StrictMode>,
)
