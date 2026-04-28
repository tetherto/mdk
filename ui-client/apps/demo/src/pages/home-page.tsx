import type { SidebarMenuItem } from '@tetherto/core'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMPONENT_NAV, getCategoryStats } from '../constants/navigation'
import './home-page.scss'

type CategoryCardProps = {
  title: string
  path: string
  description: string
  onClick: VoidFunction
  componentCount: number
}

const CategoryCard = ({
  title,
  description,
  componentCount,
  onClick,
}: CategoryCardProps): JSX.Element => {
  return (
    <button className="category-card" onClick={onClick} type="button">
      <h2 className="category-card__title">{title}</h2>
      <p className="category-card__description">{description}</p>
      <span className="category-card__count">{componentCount} components</span>
    </button>
  )
}

const CATEGORY_DESCRIPTIONS: Record<string, { description: string; path: string }> = {
  Forms: {
    description: 'Input controls and form elements for user interaction',
    path: '/buttons',
  },
  Overlays: {
    description: 'Dialogs, modals, and floating UI components',
    path: '/dialog',
  },
  'Data Display': {
    description: 'Components for presenting information and data',
    path: '/table',
  },
  Charts: {
    description: 'Data visualization and charting components',
    path: '/line-chart',
  },
  Navigation: {
    description: 'Navigation and routing components',
    path: '/tabs',
  },
  Loading: {
    description: 'Loading states and progress indicators',
    path: '/spinner',
  },
  Feedback: {
    description: 'Error handling and user feedback components',
    path: '/error-boundary',
  },
  Dashboard: {
    description: 'Domain-specific dashboard components for mining operations',
    path: '/active-incidents-card',
  },
  'Operations Centre': {
    description: 'Mining explorer and container management tools',
    path: '/device-explorer',
  },
  Alerts: {
    description: 'Site-wide alerts monitoring view',
    path: '/alerts-view',
  },
  'Pool Manager': {
    description: 'Pool management dashboard and miner explorer',
    path: '/pool-manager-dashboard',
  },
  Settings: {
    description: 'Application settings and configuration',
    path: '/settings',
  },
}

const countLeafItems = (items: SidebarMenuItem[]): number =>
  items.reduce((sum, item) => {
    if (item.items?.length) {
      return sum + countLeafItems(item.items)
    }
    return sum + 1
  }, 0)

type CategoryRow = {
  title: string
  description: string
  componentCount: number
  path: string
}

type SectionGroup = {
  section: string
  categories: CategoryRow[]
}

export const HomePage = (): JSX.Element => {
  const navigate = useNavigate()

  const sectionGroups = useMemo((): SectionGroup[] => {
    return COMPONENT_NAV.filter((item) => item.id === 'core' || item.id === 'foundation').map(
      (section) => ({
        section: section.label,
        categories: (section.items ?? []).map((category) => {
          const info = CATEGORY_DESCRIPTIONS[category.label]
          const componentCount = category.items?.length ? countLeafItems(category.items) : 1
          return {
            title: category.label,
            description: info?.description ?? '',
            componentCount,
            path: info?.path ?? `/${category.id}`,
          }
        }),
      }),
    )
  }, [])

  const stats = useMemo(() => getCategoryStats(), [])

  const handleCategoryClick = (path: string): void => {
    navigate(path)
  }

  return (
    <div className="home-page">
      <header className="home-page__header">
        <div className="home-page__header-content">
          <div className="home-page__branding">
            <div className="home-page__logo">⛏️</div>
            <div className="home-page__brand-text">
              <h1 className="home-page__brand-name">MDK</h1>
              <span className="home-page__brand-tagline">UI Development Kit</span>
            </div>
          </div>
          <div className="home-page__header-meta">
            <span className="home-page__version">v{__APP_VERSION__}</span>
            <a
              href="https://github.com/tetherto/mdk-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="home-page__github-link"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <div className="home-page__hero">
        <h2 className="home-page__title">Component Library</h2>
        <p className="home-page__subtitle">
          A comprehensive collection of production-ready UI components for building modern mining
          applications
        </p>
      </div>

      {sectionGroups.map((group) => (
        <div key={group.section} className="home-page__section">
          <h3 className="home-page__section-title">{group.section}</h3>
          <div className="home-page__categories">
            {group.categories.map((category) => (
              <CategoryCard
                key={category.title}
                {...category}
                onClick={() => handleCategoryClick(category.path)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="home-page__stats">
        <div className="stat-item">
          <span className="stat-item__value">{stats.totalComponents}</span>
          <span className="stat-item__label">Components</span>
        </div>
        <div className="stat-item">
          <span className="stat-item__value">{stats.totalCategories}</span>
          <span className="stat-item__label">Categories</span>
        </div>
        <div className="stat-item">
          <span className="stat-item__value">100%</span>
          <span className="stat-item__label">TypeScript</span>
        </div>
      </div>
    </div>
  )
}
