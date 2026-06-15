import '@tetherto/mdk-fonts/jetbrains-mono.css'
import '@tetherto/mdk-react-devkit/styles.css'
import './index.scss'

import { MdkProvider } from '@tetherto/mdk-react-adapter'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './router'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MdkProvider apiBaseUrl="http://localhost:8080">
      <RouterProvider router={router} />
    </MdkProvider>
  </React.StrictMode>,
)
