import '@tetherto/fonts/jetbrains-mono.css'
import '@tetherto/core/styles.css'
import '@tetherto/foundation/src/styles/index.scss'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './router'
import './index.scss'

// Expose build info on the window and in the document title so it survives
// Terser's production console stripping (see `drop_console: true` in
// apps/demo/vite.config.ts). Inspect via `window.__MDK_BUILD__` or
// `copy(window.__MDK_BUILD__)` in the browser console.
window.__MDK_BUILD__ = __BUILD_INFO__
document.title = `${document.title} · v${__BUILD_INFO__.version}`

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
