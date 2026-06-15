import { NavLink, Outlet } from 'react-router-dom'

import './App.scss'
import { ROUTES } from './routes'

export const App = () => {
  return (
    <div className="starter-shell">
      <header className="starter-topbar">
        <div className="starter-topbar__brand">
          <span className="starter-topbar__logo">MDK</span>
          <span className="starter-topbar__name">{'{{appName}}'}</span>
        </div>
        <span className="starter-topbar__status">
          <span className="starter-topbar__dot" /> Operational
        </span>
      </header>

      <div className="starter-content">
        <aside className="starter-sidebar">
          <nav className="starter-sidebar__nav">
            {ROUTES.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                end={route.path === '/'}
                className={({ isActive }) =>
                  isActive
                    ? 'starter-sidebar__link starter-sidebar__link--active'
                    : 'starter-sidebar__link'
                }
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
          <div className="starter-sidebar__footer">
            Add pages with <code>mdk-ui add page</code>
          </div>
        </aside>

        <main className="starter-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App
