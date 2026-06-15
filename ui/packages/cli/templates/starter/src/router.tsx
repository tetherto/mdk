import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { App } from './App'
import { ROUTES } from './routes'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: ROUTES.map((route) => {
      const Page = lazy(route.page)
      return {
        index: route.path === '/',
        path: route.path === '/' ? undefined : route.path.replace(/^\//, ''),
        element: (
          <Suspense fallback={<div className="starter-loader">Loading…</div>}>
            <Page />
          </Suspense>
        ),
      }
    }),
  },
])
