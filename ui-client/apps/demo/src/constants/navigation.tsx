import type { SidebarMenuItem } from '@tetherto/core'
import { AlertsNavIcon, PoolManagerNavIcon } from '@tetherto/core'
import {
  BarChartIcon,
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

export const COMPONENT_NAV: SidebarMenuItem[] = [
  {
    id: '',
    label: 'Home',
    icon: <HomeIcon />,
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
          { id: 'accordion', label: 'Accordion' },
          { id: 'card', label: 'Card' },
          { id: 'logs-card', label: 'Logs Card' },
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
          { id: 'chart-container', label: 'Chart Container' },
        ],
      },
      {
        id: 'navigation',
        label: 'Navigation',
        icon: <DashboardIcon />,
        items: [
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
          { id: 'bitmain-immersion-summary-box', label: 'Bitmain Immersion Summary Box' },
          { id: 'micro-bt-widget-box', label: 'Micro BT Widget Box' },
          { id: 'miners-summary-box', label: 'Miners Summary Box' },
          { id: 'pool-details-card', label: 'Pool Details Card' },
          { id: 'pool-details-popover', label: 'Pool Details Popover' },
          { id: 'stats-export', label: 'Stats Export Dropdown' },
          { id: 'supply-liquid-box', label: 'Supply Liquid Box' },
          { id: 'tanks-box', label: 'Tanks Box' },
          { id: 'widget-top-row', label: 'Widget Top Row' },
        ],
      },
      {
        id: 'foundation-charts',
        label: 'Charts',
        icon: <BarChartIcon />,
        items: [
          { id: 'chart-wrapper', label: 'Chart Wrapper' },
          { id: 'container-charts', label: 'Container Charts' },
          { id: 'consumption-line-chart', label: 'Consumption Line Chart' },
          { id: 'hash-rate-line-chart', label: 'Hash Rate Line Chart' },
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
        id: 'pool-manager',
        label: 'Pool Manager',
        icon: <PoolManagerNavIcon />,
        items: [
          { id: 'pool-manager-dashboard', label: 'Dashboard' },
          { id: 'pool-manager-miner-explorer', label: 'Miner Explorer' },
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
