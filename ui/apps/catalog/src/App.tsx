import { HamburgerMenuIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons'
import type { SidebarMenuItem } from '@tetherto/mdk-react-devkit/primitives'
import { Button, Sidebar } from '@tetherto/mdk-react-devkit/primitives'
import { useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import './App.scss'
import { COMPONENT_NAV, getBreadcrumbs } from './constants/navigation'
import { useDeviceResolution } from '@tetherto/mdk-react-adapter'

const sortMenuItems = (items: SidebarMenuItem[]): SidebarMenuItem[] =>
  [...items]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((item) => (item.items ? { ...item, items: sortMenuItems(item.items) } : item))

const filterMenuItems = (items: SidebarMenuItem[], query: string): SidebarMenuItem[] =>
  items.reduce<SidebarMenuItem[]>((acc, item) => {
    if (item.items) {
      const filteredChildren = filterMenuItems(item.items, query)
      if (filteredChildren.length > 0 || item.label.toLowerCase().includes(query)) {
        acc.push({ ...item, items: filteredChildren.length > 0 ? filteredChildren : item.items })
      }
    } else if (item.label.toLowerCase().includes(query)) {
      acc.push(item)
    }
    return acc
  }, [])

const App = (): JSX.Element => {
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isMobile } = useDeviceResolution()
  const activeSection = location.pathname === '/' ? '' : location.pathname.slice(1)

  const breadcrumbTrail = useMemo(() => {
    if (!activeSection) return null
    const trail = getBreadcrumbs(activeSection)
    if (!trail || trail.length < 2) return null
    return trail
  }, [activeSection])

  const sortedAndFilteredNav = useMemo(() => {
    const sorted = COMPONENT_NAV.map((section) => ({
      ...section,
      items: section.items ? sortMenuItems(section.items) : undefined,
    }))

    if (!searchQuery.trim()) {
      return sorted
    }

    const query = searchQuery.toLowerCase().trim()

    return sorted
      .map((section) => {
        if (!section.items) {
          return section.label.toLowerCase().includes(query) ? section : null
        }

        const filteredItems = filterMenuItems(section.items, query)

        if (filteredItems.length === 0 && !section.label.toLowerCase().includes(query)) {
          return null
        }

        return {
          ...section,
          items: filteredItems.length > 0 ? filteredItems : section.items,
        }
      })
      .filter(Boolean) as SidebarMenuItem[]
  }, [searchQuery])

  const handleNavClick = (item: SidebarMenuItem): void => {
    navigate(`/${item.id}`)
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const searchHeader = (
    <div className="demo-app__search">
      <MagnifyingGlassIcon className="demo-app__search-icon" />
      <input
        id="sidebar-search"
        name="sidebar-search"
        type="text"
        placeholder="Search components..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="demo-app__search-input"
      />
      {searchQuery && (
        <button
          className="demo-app__search-clear"
          onClick={() => setSearchQuery('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  )

  const mobileSidebarProps = {
    overlay: true,
    visible: sidebarOpen,
    onClose: () => setSidebarOpen(false),
  }

  return (
    <div className="demo-app">
      <Sidebar
        items={sortedAndFilteredNav}
        activeId={activeSection}
        onItemClick={handleNavClick}
        defaultExpanded={!!searchQuery}
        header={searchHeader}
        className="demo-app__nav"
        {...(isMobile ? mobileSidebarProps : {})}
      />
      <main className="demo-app__main" ref={mainRef}>
        <div className="demo-app__content">
          <div className="demo-app__content-header">
            {isMobile && (
              <Button
                className="demo-app__header-menu-button"
                variant="tertiary"
                size="sm"
                icon={<HamburgerMenuIcon />}
                onClick={() => setSidebarOpen(true)}
              />
            )}
            {breadcrumbTrail && (
              <nav className="mdk-breadcrumbs demo-app__breadcrumbs" aria-label="Breadcrumb">
                <ol className="mdk-breadcrumbs__list">
                  {breadcrumbTrail.map((item, index) => {
                    const isLast = index === breadcrumbTrail.length - 1
                    return (
                      <li key={item.id || 'home'} className="mdk-breadcrumbs__item">
                        {isLast ? (
                          <span
                            className="mdk-breadcrumbs__link mdk-breadcrumbs__link--current"
                            aria-current="page"
                          >
                            {item.label}
                          </span>
                        ) : (
                          <span className="mdk-breadcrumbs__link">{item.label}</span>
                        )}
                        {!isLast && (
                          <span className="mdk-breadcrumbs__separator" aria-hidden="true">
                            /
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </nav>
            )}
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default App
