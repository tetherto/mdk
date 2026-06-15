import { RequireAuth } from '@tetherto/mdk-react-devkit'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { App } from './App'
import { ROUTE_PATHS } from './constants/routes'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import SignIn from './pages/SignIn'
import { ROUTES } from './routes'

export const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.SIGN_IN,
    element: <SignIn />,
  },
  {
    path: '/',
    element: (
      <RequireAuth fallback={<Navigate to={ROUTE_PATHS.SIGN_IN} replace />}>
        <App />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTE_PATHS.DASHBOARD} replace /> },
      {
        path: ROUTE_PATHS.DASHBOARD.replace(/^\//, ''),
        element: <Dashboard />,
      },
      ...ROUTES.map((route) => {
        const Page = lazy(route.page)
        return {
          path: route.path.replace(/^\//, ''),
          element: (
            <Suspense fallback={<div className="mdk-ui-shell-loader">Loading…</div>}>
              <Page />
            </Suspense>
          ),
        }
      }),
      { path: '*', element: <NotFound /> },
    ],
  },
])
