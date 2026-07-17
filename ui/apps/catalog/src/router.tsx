import { Spinner } from '@tetherto/mdk-react-devkit/primitives'
import { lazy, Suspense } from 'react'
import type { JSX } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { AlertExample } from './examples/alert-example'
import { ListViewFilterExample } from './examples/list-view-filter-example/list-view-filter-example'
import { ChartWrapperPage } from './pages'
import { AlertsPageDemo } from './pages/alerts/alerts-page'
import { PowerModeTimelineChartDemo } from './pages/dashboard/power-mode-timeline-chart-page/power-mode-timeline-chart-page'
import { TimelineChartDemo } from './pages/domain/timeline-chart-page/timeline-chart-page'
import { BitdeerPage } from './pages/explorer-containers/bitdeer/bitdeer-page'
import { BitmainImmersionPage } from './pages/explorer-containers/bitmain-immersion/bitmain-immersion-page'
import BitmainPage from './pages/explorer-containers/bitmain/bitmain-page'
import { BitmainStatusItemDemo } from './pages/explorer-containers/bitmain/status/bitmain-status-item-demo'
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
import { PoolManagerAssignPoolModalPage } from './pages/pool-manager/assign-pool-modal/pool-manager-assign-pool-modal-page'
import { PoolManagerDashboardPage } from './pages/pool-manager/dashboard/pool-manager-dashboard-page'
import { PoolManagerMinerExplorerPageDemo } from './pages/pool-manager/miner-explorer/pool-manager-miner-explorer-page'
import { PoolManagerPoolsPageDemo } from './pages/pool-manager/pools/pool-manager-pools-page'
import { PoolManagerSiteOverviewDetailsPage } from './pages/pool-manager/site-overview-details/pool-manager-site-overview-details-page'
import { PoolManagerSitesOverviewPage } from './pages/pool-manager/sites-overview/pool-manager-sites-overview-page'
import { StateExportsPage } from './pages/stats-export-page'
import { WidgetTopRowPage } from './pages/widget-top-row-page'

// Lazy load ALL pages to eliminate unused JavaScript and CSS
const HomePage = lazy(() =>
  import('./pages/home-page').then((module) => ({ default: module.HomePage })),
)
const GettingStartedPage = lazy(() =>
  import('./pages/guides/getting-started-page').then((module) => ({
    default: module.GettingStartedPage,
  })),
)
const HooksDemoPage = lazy(() =>
  import('./pages/guides/hooks-demo-page').then((module) => ({ default: module.HooksDemoPage })),
)
const ThemingDemoPage = lazy(() =>
  import('./pages/guides/theming-demo-page').then((module) => ({
    default: module.ThemingDemoPage,
  })),
)
const ActionButtonPage = lazy(() =>
  import('./pages/action-button-page').then((module) => ({ default: module.ActionButtonPage })),
)
const AvatarPage = lazy(() =>
  import('./pages/avatar-page').then((module) => ({ default: module.AvatarPage })),
)
const BtcAveragePricePage = lazy(() =>
  import('./pages/btc-average-price-page').then((module) => ({
    default: module.BtcAveragePricePage,
  })),
)
const BreadcrumbsPage = lazy(() =>
  import('./pages/breadcrumbs-page').then((module) => ({ default: module.BreadcrumbsPage })),
)
const ButtonsPage = lazy(() =>
  import('./pages/buttons-page').then((module) => ({ default: module.ButtonsPage })),
)
const CardPage = lazy(() =>
  import('./pages/card-page').then((module) => ({ default: module.CardPage })),
)
const CurrencyTogglerPage = lazy(() =>
  import('./pages/currency-toggler-page').then((module) => ({
    default: module.CurrencyTogglerPage,
  })),
)
const ChartContainerPage = lazy(() =>
  import('./pages/chart-container-page').then((module) => ({ default: module.ChartContainerPage })),
)
const DatePickersPage = lazy(() =>
  import('./pages/date-pickers-page').then((module) => ({ default: module.DatePickersPage })),
)
const DialogPage = lazy(() =>
  import('./pages/dialog-page').then((module) => ({ default: module.DialogPage })),
)
const DropdownMenuPage = lazy(() =>
  import('./pages/dropdown-menu-page').then((module) => ({ default: module.DropdownMenuPage })),
)
const EmptyStatePage = lazy(() =>
  import('./pages/empty-state-page').then((module) => ({ default: module.EmptyStatePage })),
)
const ErrorBoundaryPage = lazy(() =>
  import('./pages/error-boundary-page').then((module) => ({ default: module.ErrorBoundaryPage })),
)
const ErrorCardPage = lazy(() =>
  import('./pages/error-card-page').then((module) => ({ default: module.ErrorCardPage })),
)
const FormElementsPage = lazy(() =>
  import('./pages/form-elements-page').then((module) => ({ default: module.FormElementsPage })),
)
const GaugeChartPage = lazy(() =>
  import('./pages/gauge-chart-page').then((module) => ({ default: module.GaugeChartPage })),
)

const HeatmapPage = lazy(() =>
  import('./pages/heatmap-page').then((module) => ({ default: module.HeatmapPage })),
)
const ThresholdLineChartPage = lazy(() =>
  import('./pages/threshold-line-chart-page').then((module) => ({
    default: module.ThresholdLineChartPage,
  })),
)
const OperationsEnergyCostChartPage = lazy(() =>
  import('./pages/operations-energy-cost-chart-page').then((module) => ({
    default: module.OperationsEnergyCostChartPage,
  })),
)
const AverageDowntimeChartPage = lazy(() =>
  import('./pages/average-downtime-chart-page').then((module) => ({
    default: module.AverageDowntimeChartPage,
  })),
)
const InputPage = lazy(() =>
  import('./pages/input-page').then((module) => ({ default: module.InputPage })),
)
const LoaderPage = lazy(() =>
  import('./pages/loader-page').then((module) => ({ default: module.LoaderPage })),
)
const LogsCardPage = lazy(() =>
  import('./pages/logs-card-page').then((module) => ({ default: module.LogsCardPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/not-found-page').then((module) => ({ default: module.NotFoundPage })),
)
const PopoverPage = lazy(() =>
  import('./pages/popover-page').then((module) => ({ default: module.PopoverPage })),
)
const RepairLogChangesPage = lazy(() =>
  import('./pages/repair-log-changes-page').then((module) => ({
    default: module.RepairLogChangesPage,
  })),
)
const RevenueChartDemo = lazy(() =>
  import('./pages/reporting-tool/financial/revenue-chart/revenue-chart-demo').then((module) => ({
    default: module.RevenueChartDemo,
  })),
)
const SelectPage = lazy(() =>
  import('./pages/select-page').then((module) => ({ default: module.SelectPage })),
)
const MultiSelectPage = lazy(() =>
  import('./pages/multi-select-page').then((module) => ({ default: module.MultiSelectPage })),
)
const SelectorPage = lazy(() =>
  import('./pages/selector-page').then((module) => ({ default: module.SelectorPage })),
)
const SidebarPage = lazy(() =>
  import('./pages/sidebar-page').then((module) => ({ default: module.SidebarPage })),
)
const SpinnerPage = lazy(() =>
  import('./pages/spinner-page').then((module) => ({ default: module.SpinnerPage })),
)
const TabsPage = lazy(() =>
  import('./pages/tabs-page').then((module) => ({ default: module.TabsPage })),
)
const TagsPage = lazy(() =>
  import('./pages/tags-page').then((module) => ({ default: module.TagsPage })),
)
const ToastPage = lazy(() =>
  import('./pages/toast-page').then((module) => ({ default: module.ToastPage })),
)
const TooltipPage = lazy(() =>
  import('./pages/tooltip-page').then((module) => ({ default: module.TooltipPage })),
)
const ActiveIncidentsCardPage = lazy(() =>
  import('./pages/active-incidents-card-page').then((module) => ({
    default: module.ActiveIncidentsCardPage,
  })),
)
const MetricCardPage = lazy(() =>
  import('./pages/metric-card-page').then((module) => ({ default: module.MetricCardPage })),
)
const PoolDetailsCardPage = lazy(() =>
  import('./pages/pool-details-card-page').then((module) => ({
    default: module.PoolDetailsCardPage,
  })),
)
const PoolDetailsPopoverPage = lazy(() =>
  import('./pages/pool-details-popover-page').then((module) => ({
    default: module.PoolDetailsPopoverPage,
  })),
)

const LineChartCardPage = lazy(() =>
  import('./pages/line-chart-card-page').then((module) => ({ default: module.LineChartCardPage })),
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
  import('./pages/form-performance-page-real').then((module) => ({
    default: module.FormPerformancePageReal,
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
  import('./pages/device-explorer-page/device-explorer-page').then((module) => ({
    default: module.DeviceExplorerPage,
  })),
)

const ExplorerPage = lazy(() =>
  import('./pages/explorer-page').then((module) => ({ default: module.ExplorerPage })),
)

const SettingsDemoPage = lazy(() =>
  import('./pages/settings/settings-demo').then((module) => ({ default: module.SettingsDemoPage })),
)

const TanksBoxPage = lazy(() =>
  import('./pages/tanks-box-page').then((module) => ({ default: module.TanksBoxPage })),
)

const BitMainImmersionSummaryBoxPage = lazy(() =>
  import('./pages/bitmain-immersion-summary-box-page').then((module) => ({
    default: module.BitMainImmersionSummaryBoxPage,
  })),
)

const ContainerChartsPage = lazy(() =>
  import('./pages/container-charts-page').then((module) => ({
    default: module.ContainerChartsPage,
  })),
)

const MicroBTWidgetBoxPage = lazy(() =>
  import('./pages/micro-bt-widget-box-page').then((module) => ({
    default: module.MicroBTWidgetBoxPage,
  })),
)

const SupplyLiquidBoxPage = lazy(() =>
  import('./pages/supply-liquid-box-page').then((module) => ({
    default: module.SupplyLiquidBoxPage,
  })),
)

const OperationalEfficiencyDemo = lazy(() =>
  import('./pages/reporting-tool/operational-efficiency/operational-efficiency-demo').then(
    (module) => ({
      default: module.OperationalEfficiencyDemo,
    }),
  ),
)
const OperationalHashrateDemo = lazy(() =>
  import('./pages/reporting-tool/operational-hashrate/operational-hashrate-demo').then(
    (module) => ({
      default: module.OperationalHashrateDemo,
    }),
  ),
)
const OperationalDashboardDemo = lazy(() =>
  import('./pages/reporting-tool/operational-dashboard/operational-dashboard-demo').then(
    (module) => ({
      default: module.OperationalDashboardDemo,
    }),
  ),
)

const EnergyReportDemo = lazy(() =>
  import('./pages/reporting-tool/operational/energy-report/energy-report-demo').then(
    (module) => ({
      default: module.EnergyReportDemo,
    }),
  ),
)

const SubsidyFeeDemo = lazy(() =>
  import('./pages/reporting-tool/financial/subsidy-fee/subsidy-fee-demo').then((module) => ({
    default: module.SubsidyFeeDemo,
  })),
)

const HashBalanceDemo = lazy(() =>
  import('./pages/reporting-tool/financial/hash-balance/hash-balance-demo').then((module) => ({
    default: module.HashBalanceDemo,
  })),
)

const EbitdaDemo = lazy(() =>
  import('./pages/reporting-tool/financial/ebitda/ebitda-demo').then((module) => ({
    default: module.EbitdaDemo,
  })),
)

const CostDemo = lazy(() =>
  import('./pages/reporting-tool/financial/cost/cost-demo').then((module) => ({
    default: module.CostDemo,
  })),
)

const MinersSummaryBoxPage = lazy(() =>
  import('./pages/miners-summary-box-page').then((module) => ({
    default: module.MinersSummaryBoxPage,
  })),
)

const ContainerWidgetsPage = lazy(() =>
  import('./pages/container-widgets-page').then((module) => ({
    default: module.ContainerWidgetsPage,
  })),
)

const EnergyBalanceDemo = lazy(() =>
  import('./pages/reporting-tool/financial/energy-balance/energy-balance-demo').then((module) => ({
    default: module.EnergyBalanceDemo,
  })),
)

const MovementDetailsModalDemo = lazy(() =>
  import('./pages/inventory/movement-details-modal/movement-details-modal-demo').then((module) => ({
    default: module.MovementDetailsModalDemo,
  })),
)

const SparePartsModalsDemo = lazy(() =>
  import('./pages/inventory/spare-parts-modals/spare-parts-modals-demo').then((module) => ({
    default: module.SparePartsModalsDemo,
  })),
)

const AppHeaderPage = lazy(() =>
  import('./pages/app-header-page').then((module) => ({ default: module.AppHeaderPage })),
)

const HeaderStatsBarPage = lazy(() =>
  import('./pages/header-stats-bar-page').then((module) => ({ default: module.HeaderStatsBarPage })),
)

const AlarmsBellButtonPage = lazy(() =>
  import('./pages/alarms-bell-button-page').then((module) => ({ default: module.AlarmsBellButtonPage })),
)

const ProfileMenuPage = lazy(() =>
  import('./pages/profile-menu-page').then((module) => ({ default: module.ProfileMenuPage })),
)

const DashboardDateRangePickerPage = lazy(() =>
  import('./pages/dashboard-date-range-picker-page').then((module) => ({
    default: module.DashboardDateRangePickerPage,
  })),
)

const ExportButtonPage = lazy(() =>
  import('./pages/export-button-page').then((module) => ({ default: module.ExportButtonPage })),
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
        { path: 'getting-started', element: withSuspense(GettingStartedPage) },
        { path: 'hooks', element: withSuspense(HooksDemoPage) },
        { path: 'theming', element: withSuspense(ThemingDemoPage) },
        { path: 'alerts', element: withSuspense(AlertExample) },
        { path: 'action-button', element: withSuspense(ActionButtonPage) },
        { path: 'buttons', element: withSuspense(ButtonsPage) },
        { path: 'form-elements', element: withSuspense(FormElementsPage) },
        { path: 'input', element: withSuspense(InputPage) },
        { path: 'select', element: withSuspense(SelectPage) },
        { path: 'multi-select', element: withSuspense(MultiSelectPage) },
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
        { path: 'heatmap', element: withSuspense(HeatmapPage) },
        { path: 'threshold-line-chart', element: withSuspense(ThresholdLineChartPage) },
        { path: 'operations-energy-cost-chart', element: withSuspense(OperationsEnergyCostChartPage) },
        { path: 'average-downtime-chart', element: withSuspense(AverageDowntimeChartPage) },
        { path: 'chart-container', element: withSuspense(ChartContainerPage) },
        { path: 'chart-wrapper', element: withSuspense(ChartWrapperPage) },
        { path: 'line-chart-card', element: withSuspense(LineChartCardPage) },
        { path: 'tabs', element: withSuspense(TabsPage) },
        { path: 'btc-average-price', element: withSuspense(BtcAveragePricePage) },
        { path: 'breadcrumbs', element: withSuspense(BreadcrumbsPage) },
        { path: 'pagination', element: withSuspense(PaginationExample) },
        { path: 'sidebar', element: withSuspense(SidebarPage) },
        { path: 'spinner', element: withSuspense(SpinnerPage) },
        { path: 'loader', element: withSuspense(LoaderPage) },
        { path: 'logs-card', element: withSuspense(LogsCardPage) },
        { path: 'repair-log-changes', element: withSuspense(RepairLogChangesPage) },
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
        {
          path: 'container-widgets',
          element: withSuspense(ContainerWidgetsPage),
        },
        { path: 'app-header', element: withSuspense(AppHeaderPage) },
        { path: 'header-stats-bar', element: withSuspense(HeaderStatsBarPage) },
        { path: 'alarms-bell-button', element: withSuspense(AlarmsBellButtonPage) },
        { path: 'profile-menu', element: withSuspense(ProfileMenuPage) },
        {
          path: 'dashboard-date-range-picker',
          element: withSuspense(DashboardDateRangePickerPage),
        },
        { path: 'export-button', element: withSuspense(ExportButtonPage) },
        { path: 'error-boundary', element: withSuspense(ErrorBoundaryPage) },
        { path: 'error-card', element: withSuspense(ErrorCardPage) },
        { path: 'active-incidents-card', element: withSuspense(ActiveIncidentsCardPage) },
        { path: 'metric-card', element: withSuspense(MetricCardPage) },
        { path: 'pool-details-card', element: withSuspense(PoolDetailsCardPage) },
        { path: 'pool-details-popover', element: withSuspense(PoolDetailsPopoverPage) },
        { path: 'device-explorer', element: withSuspense(DeviceExplorerPage) },
        { path: 'explorer-list-detail', element: withSuspense(ExplorerPage) },
        { path: 'bitdeer-container', element: withSuspense(BitdeerPage) },
        { path: 'bitmain-container', element: withSuspense(BitmainPage) },
        {
          path: 'bitmain-immersion-container',
          element: withSuspense(BitmainImmersionPage),
        },
        { path: 'micro-bt-container', element: withSuspense(MicroBTPage) },
        { path: 'bitmain-status-item', element: withSuspense(BitmainStatusItemDemo) },
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
        { path: 'power-mode-timeline-chart', element: withSuspense(PowerModeTimelineChartDemo) },
        { path: 'timeline-chart', element: withSuspense(TimelineChartDemo) },
        { path: 'miner-socket', element: withSuspense(SocketDemo) },
        { path: 'settings', element: withSuspense(SettingsDemoPage) },
        { path: 'movement-details-modal', element: withSuspense(MovementDetailsModalDemo) },
        { path: 'spare-parts-modals', element: withSuspense(SparePartsModalsDemo) },
        { path: 'pool-manager-assign-pool-modal', element: withSuspense(PoolManagerAssignPoolModalPage) },
        { path: 'pool-manager-dashboard', element: withSuspense(PoolManagerDashboardPage) },
        {
          path: 'pool-manager-miner-explorer',
          element: withSuspense(PoolManagerMinerExplorerPageDemo),
        },
        {
          path: 'pool-manager-pools',
          element: withSuspense(PoolManagerPoolsPageDemo),
        },
        {
          path: 'pool-manager-sites-overview',
          element: withSuspense(PoolManagerSitesOverviewPage),
        },
        {
          path: 'pool-manager-sites-overview/:unitId',
          element: withSuspense(PoolManagerSiteOverviewDetailsPage),
        },
        { path: 'operational-efficiency', element: withSuspense(OperationalEfficiencyDemo) },
        { path: 'operational-hashrate', element: withSuspense(OperationalHashrateDemo) },
        { path: 'operational-dashboard', element: withSuspense(OperationalDashboardDemo) },
        { path: 'operational-energy', element: withSuspense(EnergyReportDemo) },
        { path: 'subsidy-fee', element: withSuspense(SubsidyFeeDemo) },
        { path: 'hash-balance', element: withSuspense(HashBalanceDemo) },
        { path: 'ebitda', element: withSuspense(EbitdaDemo) },
        { path: 'revenue-chart', element: withSuspense(RevenueChartDemo) },
        { path: 'cost', element: withSuspense(CostDemo) },
        { path: 'alerts-view', element: withSuspense(AlertsPageDemo) },
        {
          path: 'energy-balance',
          element: withSuspense(EnergyBalanceDemo),
        },
        { path: '*', element: withSuspense(NotFoundPage) },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
