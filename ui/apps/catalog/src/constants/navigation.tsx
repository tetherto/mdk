import {
  BarChartIcon,
  BookmarkIcon,
  ChatBubbleIcon,
  CubeIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  GearIcon,
  HomeIcon,
  InputIcon,
  LayersIcon,
  MagnifyingGlassIcon,
  StackIcon,
} from '@radix-ui/react-icons'
import type { SidebarMenuItem } from '@tetherto/mdk-react-devkit/core'
import {
  AlertsNavIcon,
  PoolManagerNavIcon,
  ReportingNavIcon,
} from '@tetherto/mdk-react-devkit/core'

export const COMPONENT_NAV: SidebarMenuItem[] = [
  {
    id: '',
    label: 'Home',
    icon: <HomeIcon />,
  },
  {
    id: 'guides',
    label: 'Guides',
    icon: <BookmarkIcon />,
    items: [
      { id: 'getting-started', label: 'Getting Started' },
      { id: 'hooks', label: 'Adapter Hooks' },
      { id: 'theming', label: 'Theming' },
    ],
  },
  {
    id: 'core',
    label: 'Core',
    icon: <LayersIcon />,
    items: [
      {
        id: 'forms',
        label: 'Forms',
        icon: <InputIcon />,
        items: [
          { id: 'action-button', label: 'Action Button' },
          { id: 'buttons', label: 'Buttons' },
          { id: 'form-elements', label: 'Form Elements' },
          { id: 'input', label: 'Input' },
          { id: 'select', label: 'Select' },
          { id: 'multi-select', label: 'Multi-Select' },
          { id: 'selector', label: 'Selector' },
          { id: 'checkbox-switch', label: 'Checkbox & Switch' },
          { id: 'radio', label: 'Radio' },
          { id: 'date-pickers', label: 'Date Pickers' },
          { id: 'textarea', label: 'TextArea' },
          { id: 'form', label: 'Form (Basic)' },
          { id: 'form-enhanced', label: 'Form (Enhanced)' },
          { id: 'form-advanced', label: 'Form (Advanced)' },
          { id: 'form-performance', label: 'Form Performance' },
        ],
      },
      {
        id: 'overlays',
        label: 'Overlays',
        icon: <ChatBubbleIcon />,
        items: [
          { id: 'dialog', label: 'Dialog' },
          { id: 'dropdown-menu', label: 'Dropdown Menu' },
          { id: 'cascader', label: 'Cascader' },
          { id: 'tooltip', label: 'Tooltip' },
          { id: 'popover', label: 'Popover' },
          { id: 'toast', label: 'Toast' },
        ],
      },
      {
        id: 'data-display',
        label: 'Data Display',
        icon: <StackIcon />,
        items: [
          { id: 'alerts', label: 'Alerts' },
          { id: 'table', label: 'Table' },
          { id: 'list-view-filter', label: 'List View Filter' },
          { id: 'mosaic', label: 'Mosaic' },
          { id: 'avatar', label: 'Avatar' },
          { id: 'btc-average-price', label: 'BTC Average Price' },
          { id: 'accordion', label: 'Accordion' },
          { id: 'card', label: 'Card' },
          { id: 'logs-card', label: 'Logs Card' },
          { id: 'repair-log-changes', label: 'Repair Log Changes' },
          { id: 'currency-toggler', label: 'Currency Toggler' },
          { id: 'typography', label: 'Typography' },
          { id: 'tags', label: 'Tags' },
          { id: 'indicators', label: 'Indicators' },
          { id: 'mining-icons', label: 'Mining Icons' },
          { id: 'empty-state', label: 'Empty State' },
        ],
      },
      {
        id: 'charts',
        label: 'Charts',
        icon: <BarChartIcon />,
        items: [
          { id: 'line-chart', label: 'Line Chart' },
          { id: 'bar-chart', label: 'Bar Chart' },
          { id: 'area-chart', label: 'Area Chart' },
          { id: 'doughnut-chart', label: 'Doughnut Chart' },
          { id: 'gauge-chart', label: 'Gauge Chart' },
          { id: 'threshold-line-chart', label: 'Threshold Line Chart' },
          { id: 'operations-energy-cost-chart', label: 'Operations vs Energy Cost Chart' },
          { id: 'average-downtime-chart', label: 'Average Downtime Chart' },
          { id: 'chart-container', label: 'Chart Container' },
        ],
      },
      {
        id: 'navigation',
        label: 'Navigation',
        icon: <DashboardIcon />,
        items: [
          { id: 'app-header', label: 'App Header' },
          { id: 'tabs', label: 'Tabs' },
          { id: 'breadcrumbs', label: 'Breadcrumbs' },
          { id: 'pagination', label: 'Pagination' },
          { id: 'sidebar', label: 'Sidebar' },
        ],
      },
      {
        id: 'loading',
        label: 'Loading',
        icon: <CubeIcon />,
        items: [
          { id: 'spinner', label: 'Spinner' },
          { id: 'loader', label: 'Loader' },
        ],
      },
      {
        id: 'feedback',
        label: 'Feedback',
        icon: <ExclamationTriangleIcon />,
        items: [
          { id: 'error-boundary', label: 'Error Boundary' },
          { id: 'error-card', label: 'Error Card' },
          { id: 'not-found-page', label: 'Not Found Page' },
        ],
      },
    ],
  },
  {
    id: 'foundation',
    label: 'Foundation',
    icon: <DashboardIcon />,
    items: [
      {
        id: 'dashboard-widgets',
        label: 'Dashboard Widgets',
        icon: <DashboardIcon />,
        items: [
          { id: 'active-incidents-card', label: 'Active Incidents Card' },
          { id: 'alarms-bell-button', label: 'Alarms Bell Button' },
          { id: 'bitmain-immersion-summary-box', label: 'Bitmain Immersion Summary Box' },
          { id: 'dashboard-date-range-picker', label: 'Dashboard Date Range Picker' },
          { id: 'export-button', label: 'Export Button' },
          { id: 'header-stats-bar', label: 'Header Stats Bar' },
          { id: 'metric-card', label: 'Metric Card' },
          { id: 'micro-bt-widget-box', label: 'Micro BT Widget Box' },
          { id: 'miners-summary-box', label: 'Miners Summary Box' },
          { id: 'pool-details-card', label: 'Pool Details Card' },
          { id: 'pool-details-popover', label: 'Pool Details Popover' },
          { id: 'profile-menu', label: 'Profile Menu' },
          { id: 'stats-export', label: 'Stats Export Dropdown' },
          { id: 'supply-liquid-box', label: 'Supply Liquid Box' },
          { id: 'tanks-box', label: 'Tanks Box' },
          { id: 'widget-top-row', label: 'Widget Top Row' },
        ],
      },
      {
        id: 'reporting-tool',
        label: 'Reporting Tool',
        icon: <ReportingNavIcon />,
        items: [
          { id: 'operational-dashboard', label: 'Operational Dashboard' },
          { id: 'operational-efficiency', label: 'Operational Efficiency' },
          { id: 'operational-hashrate', label: 'Operational Hashrate' },
          { id: 'operational-energy', label: 'Energy' },
          { id: 'subsidy-fee', label: 'Subsidy / Fee' },
          { id: 'hash-balance', label: 'Hash Balance' },
          { id: 'ebitda', label: 'EBITDA' },
          { id: 'revenue-chart', label: 'Revenue Chart' },
          { id: 'cost', label: 'Cost Summary' },
          { id: 'energy-balance', label: 'Energy Balance' },
          { id: 'site-reports', label: 'Reports (All Sites)' },
          { id: 'sites/uy/site-reports', label: 'Reports (Uruguay)' },
          { id: 'sites/py/site-reports', label: 'Reports (Paraguay)' },
        ],
      },
      {
        id: 'foundation-charts',
        label: 'Charts',
        icon: <BarChartIcon />,
        items: [
          { id: 'chart-wrapper', label: 'Chart Wrapper' },
          { id: 'container-charts', label: 'Container Charts' },
          { id: 'line-chart-card', label: 'Line Chart Card' },
          { id: 'power-mode-timeline-chart', label: 'Power Mode Timeline Chart' },
          { id: 'timeline-chart', label: 'Timeline Chart' },
        ],
      },
      {
        id: 'operations-centre',
        label: 'Operations Centre',
        icon: <MagnifyingGlassIcon />,
        items: [
          {
            id: 'operations-mining',
            label: 'Mining',
            items: [
              {
                id: 'explorer',
                label: 'Explorer',
                items: [
                  { id: 'device-explorer', label: 'Device Explorer' },
                  {
                    id: 'explorer-containers',
                    label: 'Containers',
                    items: [
                      { id: 'bitdeer-container', label: 'Bitdeer Container' },
                      { id: 'bitmain-container', label: 'Bitmain Container' },
                      {
                        id: 'bitmain-immersion-container',
                        label: 'Bitmain Immersion Container',
                      },
                      { id: 'micro-bt-container', label: 'Micro BT Container' },
                      { id: 'bitmain-status-item', label: 'Bitmain Status Item' },
                      { id: 'miner-socket', label: 'Socket' },
                    ],
                  },
                  {
                    id: 'explorer-details-view',
                    label: 'Details View',
                    items: [
                      { id: 'single-stat-card', label: 'Single Stat Card' },
                      { id: 'secondary-stat-card', label: 'Secondary Stat Card' },
                      { id: 'stats-group-card', label: 'Stats Group Card' },
                      { id: 'miner-info-card', label: 'Miner Info Card' },
                      { id: 'miner-chips-card', label: 'Miner Chips Card' },
                      { id: 'miners-activity-chart', label: 'Miners Activity Chart' },
                      { id: 'miner-power-mode', label: 'Miner Power Mode' },
                      { id: 'miner-controls-card', label: 'Miner Controls Card' },
                      { id: 'container-controls-card', label: 'Container Controls Card' },
                      { id: 'fleet-management', label: 'Fleet Management' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'alerts-view',
        label: 'Alerts',
        icon: <AlertsNavIcon />,
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: <StackIcon />,
        items: [{ id: 'movement-details-modal', label: 'Movement Details Modal' }],
      },
      {
        id: 'pool-manager',
        label: 'Pool Manager',
        icon: <PoolManagerNavIcon />,
        items: [
          { id: 'pool-manager-assign-pool-modal', label: 'Assign Pool Modal' },
          { id: 'pool-manager-dashboard', label: 'Dashboard' },
          { id: 'pool-manager-miner-explorer', label: 'Miner Explorer' },
          { id: 'pool-manager-sites-overview', label: 'Sites Overview' },
          { id: 'pool-manager-pools', label: 'Pools' },
        ],
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <GearIcon />,
      },
    ],
  },
]

const countLeafItems = (items: SidebarMenuItem[]): number =>
  items.reduce((sum, item) => {
    if (item.items?.length) {
      return sum + countLeafItems(item.items)
    }
    return sum + 1
  }, 0)

export const getCategoryStats = (): { totalComponents: number; totalCategories: number } => {
  const coreSection = COMPONENT_NAV.find((item) => item.id === 'core')
  const foundationSection = COMPONENT_NAV.find((item) => item.id === 'foundation')

  const coreItems = coreSection?.items ?? []
  const foundationItems = foundationSection?.items ?? []

  const totalComponents = countLeafItems([...coreItems, ...foundationItems])
  const totalCategories = coreItems.length + foundationItems.length

  return { totalComponents, totalCategories }
}

export const getCategoryByLabel = (label: string): SidebarMenuItem | undefined => {
  return COMPONENT_NAV.find((item) => item.label === label)
}

export const getBreadcrumbs = (
  routeId: string,
  items: SidebarMenuItem[] = COMPONENT_NAV,
  ancestors: SidebarMenuItem[] = [],
): SidebarMenuItem[] | null => {
  for (const item of items) {
    const path = [...ancestors, item]
    if (item.id === routeId) return path
    if (item.items) {
      const found = getBreadcrumbs(routeId, item.items, path)
      if (found) return found
    }
  }
  return null
}
