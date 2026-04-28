import type { SidebarMenuItem } from '@tetherto/core'
import { Sidebar } from '@tetherto/core'
import { store } from '@tetherto/foundation'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { useMemo, useRef, useState } from 'react'
import { Provider } from 'react-redux'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import './App.scss'
import { COMPONENT_NAV } from './constants/navigation'

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

  const activeSection = location.pathname === '/' ? '' : location.pathname.slice(1)

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

  return (
    <div className="demo-app">
      <Sidebar
        items={sortedAndFilteredNav}
        activeId={activeSection}
        onItemClick={handleNavClick}
        defaultExpanded={!!searchQuery}
        header={searchHeader}
        className="demo-app__nav"
      />
      <main className="demo-app__main" ref={mainRef}>
        <div className="demo-app__content">
          <Provider store={store}>
            <Outlet />
          </Provider>
        </div>
      </main>
    </div>
  )
}

export default App
