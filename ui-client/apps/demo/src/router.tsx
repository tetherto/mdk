import { Spinner } from '@tetherto/core'
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { AlertExample } from './examples/alert-example'
import { ListViewFilterExample } from './examples/list-view-filter-example/list-view-filter-example'
import { ChartWrapperPage } from './pages'
import { AlertsPageDemo } from './pages/alerts/alerts-page'
import { ConsumptionLineChartDemo } from './pages/dashboard/consumption-line-chart-page/consumption-line-chart-page'
import { HashRateLineChartSelectorDemo } from './pages/dashboard/hash-rate-line-chart-page/hash-rate-line-chart-selector-demo'
import { PowerModeTimelineChartDemo } from './pages/dashboard/power-mode-timeline-chart-page/power-mode-timeline-chart-page'
import { TimelineChartDemo } from './pages/domain/timeline-chart-page/timeline-chart-page'
import { BitdeerPage } from './pages/explorer-containers/bitdeer/bitdeer-page'
import { BitmainImmersionPage } from './pages/explorer-containers/bitmain-immersion/bitmain-immersion-page'
import BitmainPage from './pages/explorer-containers/bitmain/bitmain-page'
import { MicroBTPage } from './pages/explorer-containers/micro-bt/micro-bt-page'
import { SocketDemo } from './pages/explorer-containers/socket/socket-demo'
import { BatchContainerControlsCardDemo } from './pages/explorer-details-view/container-controls-box/batch-container-controls-card-demo'
import { FleetManagementDemo } from './pages/explorer-details-view/fleet-management/fleet-management-demo'
import { MinerChipsCardDemo } from './pages/explorer-details-view/miner-chips-card/miner-chips-card-demo'
import { MinerControlsCardDemo } from './pages/explorer-details-view/miner-controls-card/miner-controls-card-demo'
import { MinerInfoCardDemo } from './pages/explorer-details-view/miner-info-card/miner-info-card.demo'
import { MinerPowerModeDemo } from './pages/explorer-details-view/miner-power-mode/miner-power-mode-demo'
import { MinersActivityChartDemo } from './pages/explorer-details-view/miners-activity-chart/miners-activity-chart-demo'
import { SecondaryStatCardDemo } from './pages/explorer-details-view/secondary-stat-card/secondary-stat-card-demo'
import { SingleStatCardDemo } from './pages/explorer-details-view/single-stat-card/single-stat-card-demo'
import { StatsGroupCardDemo } from './pages/explorer-details-view/stats-group-card/stats-group-card-demo'
import { MosaicPageDemo } from './pages/mosaic-page/mosaic.page'
import { PoolManagerDashboardPage } from './pages/pool-manager/dashboard/pool-manager-dashboard-page'
import { PoolManagerMinerExplorerPageDemo } from './pages/pool-manager/miner-explorer/pool-manager-miner-explorer-page'
import { PoolManagerPoolsPageDemo } from './pages/pool-manager/pools/pool-manager-pools-page'
import { StateExportsPage } from './pages/stats-export-page'
import { WidgetTopRowPage } from './pages/widget-top-row-page'

// Lazy load ALL pages to eliminate unused JavaScript and CSS
const HomePage = lazy(() => import('./pages/home-page').then((m) => ({ default: m.HomePage })))
const ActionButtonPage = lazy(() =>
  import('./pages/action-button-page').then((m) => ({ default: m.ActionButtonPage })),
)
const AvatarPage = lazy(() =>
  import('./pages/avatar-page').then((m) => ({ default: m.AvatarPage })),
)
const BreadcrumbsPage = lazy(() =>
  import('./pages/breadcrumbs-page').then((m) => ({ default: m.BreadcrumbsPage })),
)
const ButtonsPage = lazy(() =>
  import('./pages/buttons-page').then((m) => ({ default: m.ButtonsPage })),
)
const CardPage = lazy(() => import('./pages/card-page').then((m) => ({ default: m.CardPage })))
const CurrencyTogglerPage = lazy(() =>
  import('./pages/currency-toggler-page').then((m) => ({ default: m.CurrencyTogglerPage })),
)
const ChartContainerPage = lazy(() =>
  import('./pages/chart-container-page').then((m) => ({ default: m.ChartContainerPage })),
)
const DatePickersPage = lazy(() =>
  import('./pages/date-pickers-page').then((m) => ({ default: m.DatePickersPage })),
)
const DialogPage = lazy(() =>
  import('./pages/dialog-page').then((m) => ({ default: m.DialogPage })),
)
const DropdownMenuPage = lazy(() =>
  import('./pages/dropdown-menu-page').then((m) => ({ default: m.DropdownMenuPage })),
)
const EmptyStatePage = lazy(() =>
  import('./pages/empty-state-page').then((m) => ({ default: m.EmptyStatePage })),
)
const ErrorBoundaryPage = lazy(() =>
  import('./pages/error-boundary-page').then((m) => ({ default: m.ErrorBoundaryPage })),
)
const ErrorCardPage = lazy(() =>
  import('./pages/error-card-page').then((m) => ({ default: m.ErrorCardPage })),
)
const FormElementsPage = lazy(() =>
  import('./pages/form-elements-page').then((m) => ({ default: m.FormElementsPage })),
)
const GaugeChartPage = lazy(() =>
  import('./pages/gauge-chart-page').then((m) => ({ default: m.GaugeChartPage })),
)
const InputPage = lazy(() => import('./pages/input-page').then((m) => ({ default: m.InputPage })))
const LoaderPage = lazy(() =>
  import('./pages/loader-page').then((m) => ({ default: m.LoaderPage })),
)
const LogsCardPage = lazy(() =>
  import('./pages/logs-card-page').then((m) => ({ default: m.LogsCardPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/not-found-page').then((m) => ({ default: m.NotFoundPage })),
)
const PopoverPage = lazy(() =>
  import('./pages/popover-page').then((m) => ({ default: m.PopoverPage })),
)
const SelectPage = lazy(() =>
  import('./pages/select-page').then((m) => ({ default: m.SelectPage })),
)
const SelectorPage = lazy(() =>
  import('./pages/selector-page').then((m) => ({ default: m.SelectorPage })),
)
const SidebarPage = lazy(() =>
  import('./pages/sidebar-page').then((m) => ({ default: m.SidebarPage })),
)
const SpinnerPage = lazy(() =>
  import('./pages/spinner-page').then((m) => ({ default: m.SpinnerPage })),
)
const TabsPage = lazy(() => import('./pages/tabs-page').then((m) => ({ default: m.TabsPage })))
const TagsPage = lazy(() => import('./pages/tags-page').then((m) => ({ default: m.TagsPage })))
const ToastPage = lazy(() => import('./pages/toast-page').then((m) => ({ default: m.ToastPage })))
const TooltipPage = lazy(() =>
  import('./pages/tooltip-page').then((m) => ({ default: m.TooltipPage })),
)
const ActiveIncidentsCardPage = lazy(() =>
  import('./pages/active-incidents-card-page').then((m) => ({
    default: m.ActiveIncidentsCardPage,
  })),
)
const PoolDetailsCardPage = lazy(() =>
  import('./pages/pool-details-card-page').then((m) => ({ default: m.PoolDetailsCardPage })),
)
const PoolDetailsPopoverPage = lazy(() =>
  import('./pages/pool-details-popover-page').then((m) => ({
    default: m.PoolDetailsPopoverPage,
  })),
)

const LineChartCardPage = lazy(() =>
  import('./pages/line-chart-card-page').then((m) => ({ default: m.LineChartCardPage })),
)

const LwLineChartExample = lazy(() =>
  import('./examples/lightweight-line-chart-example').then((module) => ({
    default: module.LwLineChartExample,
  })),
)

const BarChartExample = lazy(() =>
  import('./examples/bar-chart-example').then((module) => ({ default: module.BarChartExample })),
)
const AreaChartExample = lazy(() =>
  import('./examples/area-chart-example').then((module) => ({
    default: module.AreaChartExample,
  })),
)
const DoughnutChartPage = lazy(() =>
  import('./pages/doughnut-chart-page').then((module) => ({ default: module.DoughnutChartPage })),
)
const AccordionExample = lazy(() =>
  import('./examples/accordion-example').then((module) => ({ default: module.AccordionExample })),
)
const CascaderExample = lazy(() =>
  import('./examples/cascader-example').then((module) => ({ default: module.CascaderExample })),
)
const CheckboxExample = lazy(() =>
  import('./examples/checkbox-example').then((module) => ({ default: module.CheckboxExample })),
)
const DemoTable = lazy(() =>
  import('./examples/demo-table').then((module) => ({ default: module.DemoTable })),
)
const FormExample = lazy(() => import('./examples/form-example'))
const FormEnhancedExample = lazy(() => import('./examples/form-enhanced-example'))
const FormAdvancedExample = lazy(() => import('./examples/form-advanced-example'))
const FormPerformancePage = lazy(() =>
  import('./pages/form-performance-page-real').then((m) => ({
    default: m.FormPerformancePageReal,
  })),
)
const IndicatorsExample = lazy(() =>
  import('./examples/indicators-example').then((module) => ({
    default: module.IndicatorsExample,
  })),
)
const PaginationExample = lazy(() => import('./examples/pagination-example'))
const RadioExample = lazy(() =>
  import('./examples/radio-example').then((module) => ({ default: module.RadioExample })),
)
const TextAreaExample = lazy(() => import('./examples/textarea-example'))
const TypographyExample = lazy(() =>
  import('./examples/typography-example').then((module) => ({
    default: module.TypographyExample,
  })),
)
const MiningIconsExample = lazy(() =>
  import('./examples/mining-icons-example').then((module) => ({
    default: module.MiningIconsExample,
  })),
)

const DeviceExplorerPage = lazy(() =>
  import('./pages/device-explorer-page/device-explorer-page').then((m) => ({
    default: m.DeviceExplorerPage,
  })),
)

const SettingsDemoPage = lazy(() =>
  import('./pages/settings/settings-demo').then((m) => ({ default: m.SettingsDemoPage })),
)

const TanksBoxPage = lazy(() =>
  import('./pages/tanks-box-page').then((m) => ({ default: m.TanksBoxPage })),
)

const BitMainImmersionSummaryBoxPage = lazy(() =>
  import('./pages/bitmain-immersion-summary-box-page').then((m) => ({
    default: m.BitMainImmersionSummaryBoxPage,
  })),
)

const ContainerChartsPage = lazy(() =>
  import('./pages/container-charts-page').then((m) => ({ default: m.ContainerChartsPage })),
)

const MicroBTWidgetBoxPage = lazy(() =>
  import('./pages/micro-bt-widget-box-page').then((m) => ({
    default: m.MicroBTWidgetBoxPage,
  })),
)

const SupplyLiquidBoxPage = lazy(() =>
  import('./pages/supply-liquid-box-page').then((m) => ({
    default: m.SupplyLiquidBoxPage,
  })),
)

const MinersSummaryBoxPage = lazy(() =>
  import('./pages/miners-summary-box-page').then((m) => ({
    default: m.MinersSummaryBoxPage,
  })),
)

const SectionLoader = (): JSX.Element => (
  <div className="demo-section-loader">
    <Spinner />
  </div>
)

const withSuspense = (Component: React.ComponentType): JSX.Element => (
  <Suspense fallback={<SectionLoader />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: withSuspense(HomePage) },
        { path: 'alerts', element: withSuspense(AlertExample) },
        { path: 'action-button', element: withSuspense(ActionButtonPage) },
        { path: 'buttons', element: withSuspense(ButtonsPage) },
        { path: 'form-elements', element: withSuspense(FormElementsPage) },
        { path: 'input', element: withSuspense(InputPage) },
        { path: 'select', element: withSuspense(SelectPage) },
        { path: 'selector', element: withSuspense(SelectorPage) },
        { path: 'checkbox-switch', element: withSuspense(CheckboxExample) },
        { path: 'radio', element: withSuspense(RadioExample) },
        { path: 'date-pickers', element: withSuspense(DatePickersPage) },
        { path: 'textarea', element: withSuspense(TextAreaExample) },
        { path: 'form', element: withSuspense(FormExample) },
        { path: 'form-enhanced', element: withSuspense(FormEnhancedExample) },
        { path: 'form-advanced', element: withSuspense(FormAdvancedExample) },
        { path: 'form-performance', element: withSuspense(FormPerformancePage) },
        { path: 'dialog', element: withSuspense(DialogPage) },
        { path: 'dropdown-menu', element: withSuspense(DropdownMenuPage) },
        { path: 'cascader', element: withSuspense(CascaderExample) },
        { path: 'tooltip', element: withSuspense(TooltipPage) },
        { path: 'popover', element: withSuspense(PopoverPage) },
        { path: 'toast', element: withSuspense(ToastPage) },
        { path: 'table', element: withSuspense(DemoTable) },
        { path: 'avatar', element: withSuspense(AvatarPage) },
        { path: 'accordion', element: withSuspense(AccordionExample) },
        { path: 'card', element: withSuspense(CardPage) },
        { path: 'currency-toggler', element: withSuspense(CurrencyTogglerPage) },
        { path: 'typography', element: withSuspense(TypographyExample) },
        { path: 'tags', element: withSuspense(TagsPage) },
        { path: 'indicators', element: withSuspense(IndicatorsExample) },
        { path: 'list-view-filter', element: withSuspense(ListViewFilterExample) },
        { path: 'mosaic', element: withSuspense(MosaicPageDemo) },
        { path: 'mining-icons', element: withSuspense(MiningIconsExample) },
        { path: 'empty-state', element: withSuspense(EmptyStatePage) },
        { path: 'line-chart', element: withSuspense(LwLineChartExample) },
        { path: 'bar-chart', element: withSuspense(BarChartExample) },
        { path: 'area-chart', element: withSuspense(AreaChartExample) },
        { path: 'doughnut-chart', element: withSuspense(DoughnutChartPage) },
        { path: 'gauge-chart', element: withSuspense(GaugeChartPage) },
        { path: 'chart-container', element: withSuspense(ChartContainerPage) },
        { path: 'chart-wrapper', element: withSuspense(ChartWrapperPage) },
        { path: 'line-chart-card', element: withSuspense(LineChartCardPage) },
        { path: 'tabs', element: withSuspense(TabsPage) },
        { path: 'breadcrumbs', element: withSuspense(BreadcrumbsPage) },
        { path: 'pagination', element: withSuspense(PaginationExample) },
        { path: 'sidebar', element: withSuspense(SidebarPage) },
        { path: 'spinner', element: withSuspense(SpinnerPage) },
        { path: 'loader', element: withSuspense(LoaderPage) },
        { path: 'logs-card', element: withSuspense(LogsCardPage) },
        { path: 'stats-export', element: withSuspense(StateExportsPage) },
        { path: 'widget-top-row', element: withSuspense(WidgetTopRowPage) },
        { path: 'tanks-box', element: withSuspense(TanksBoxPage) },
        {
          path: 'bitmain-immersion-summary-box',
          element: withSuspense(BitMainImmersionSummaryBoxPage),
        },
        {
          path: 'container-charts',
          element: withSuspense(ContainerChartsPage),
        },
        {
          path: 'micro-bt-widget-box',
          element: withSuspense(MicroBTWidgetBoxPage),
        },
        { path: 'supply-liquid-box', element: withSuspense(SupplyLiquidBoxPage) },
        {
          path: 'miners-summary-box',
          element: withSuspense(MinersSummaryBoxPage),
        },
        { path: 'error-boundary', element: withSuspense(ErrorBoundaryPage) },
        { path: 'error-card', element: withSuspense(ErrorCardPage) },
        { path: 'active-incidents-card', element: withSuspense(ActiveIncidentsCardPage) },
        { path: 'pool-details-card', element: withSuspense(PoolDetailsCardPage) },
        { path: 'pool-details-popover', element: withSuspense(PoolDetailsPopoverPage) },
        { path: 'device-explorer', element: withSuspense(DeviceExplorerPage) },
        { path: 'bitdeer-container', element: withSuspense(BitdeerPage) },
        { path: 'bitmain-container', element: withSuspense(BitmainPage) },
        {
          path: 'bitmain-immersion-container',
          element: withSuspense(BitmainImmersionPage),
        },
        { path: 'micro-bt-container', element: withSuspense(MicroBTPage) },
        { path: 'secondary-stat-card', element: withSuspense(SecondaryStatCardDemo) },
        { path: 'single-stat-card', element: withSuspense(SingleStatCardDemo) },
        { path: 'stats-group-card', element: withSuspense(StatsGroupCardDemo) },
        { path: 'miner-info-card', element: withSuspense(MinerInfoCardDemo) },
        { path: 'miner-chips-card', element: withSuspense(MinerChipsCardDemo) },
        { path: 'miners-activity-chart', element: withSuspense(MinersActivityChartDemo) },
        { path: 'miner-power-mode', element: withSuspense(MinerPowerModeDemo) },
        { path: 'miner-controls-card', element: withSuspense(MinerControlsCardDemo) },
        { path: 'container-controls-card', element: withSuspense(BatchContainerControlsCardDemo) },
        { path: 'fleet-management', element: withSuspense(FleetManagementDemo) },
        { path: 'hash-rate-line-chart', element: withSuspense(HashRateLineChartSelectorDemo) },
        { path: 'consumption-line-chart', element: withSuspense(ConsumptionLineChartDemo) },
        { path: 'power-mode-timeline-chart', element: withSuspense(PowerModeTimelineChartDemo) },
        { path: 'timeline-chart', element: withSuspense(TimelineChartDemo) },
        { path: 'miner-socket', element: withSuspense(SocketDemo) },
        { path: 'settings', element: withSuspense(SettingsDemoPage) },
        { path: 'pool-manager-dashboard', element: withSuspense(PoolManagerDashboardPage) },
        {
          path: 'pool-manager-miner-explorer',
          element: withSuspense(PoolManagerMinerExplorerPageDemo),
        },
        {
          path: 'pool-manager-pools',
          element: withSuspense(PoolManagerPoolsPageDemo),
        },
        { path: 'alerts-view', element: withSuspense(AlertsPageDemo) },
        { path: '*', element: withSuspense(NotFoundPage) },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
