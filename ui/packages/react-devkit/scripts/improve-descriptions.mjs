#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-shot migration that replaces auto-generated placeholder JSDoc
 * descriptions ("Foo Component.", "Use Bar hook.") with meaningful
 * one-liners. Keyed by export name. Safe to re-run: it only matches the
 * exact placeholder strings and leaves real descriptions alone.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(SCRIPT_DIR, '..')
const SRC_ROOT = join(PKG_ROOT, 'src')

const DESCRIPTIONS = {
  AlertDialogAction:
    'Primary confirmation button inside an `<AlertDialog>`; clicking dismisses the dialog and runs the action handler.',
  AlertDialogCancel:
    'Secondary dismiss button inside an `<AlertDialog>`; closes the dialog without invoking the destructive action.',
  AlertDialogContent:
    'Modal content surface for an `<AlertDialog>` — renders the centered panel above the overlay with focus trap.',
  AlertDialogDescription:
    'Supporting body text inside an `<AlertDialog>`; conveys the consequences of the action being confirmed.',
  AlertDialogFooter:
    'Right-aligned action row inside an `<AlertDialog>` — hosts the cancel and confirm buttons.',
  AlertDialogHeader:
    'Top section of an `<AlertDialog>` that groups the title and description above the action row.',
  AlertDialogOverlay:
    'Full-viewport scrim rendered behind an `<AlertDialog>` to block interaction with the page.',
  AlertDialogTitle:
    'Prominent title text inside an `<AlertDialog>` summarising the action that requires confirmation.',
  Avatar:
    'Circular avatar surface that shows a profile image with a graceful text fallback when the image fails to load.',
  AvatarFallback:
    'Initials or icon placeholder shown inside `<Avatar>` while the image loads or when no image is available.',
  AvatarImage:
    'Profile image slot inside `<Avatar>` — renders `src` and triggers the fallback on load failure.',
  BarChart:
    'Presentational Chart.js bar chart. Data must be pre-aggregated; use grouped or stacked categories via `datasets`.',
  CardBody:
    'Main content region of a `<Card>` — applies the standard inner padding and vertical rhythm.',
  CardFooter:
    'Bottom action/metadata row of a `<Card>`, typically used for buttons, timestamps, or secondary info.',
  CardHeader:
    'Top region of a `<Card>` that groups the title, optional subtitle, and an action slot.',
  Cascader:
    'Two-panel hierarchical selector for picking a leaf value from a nested tree (categories → subcategories → leaf).',
  DialogContent:
    'Centered modal surface for a `<Dialog>` — renders above the overlay with focus trap and Escape-to-close.',
  DialogDescription: 'Supporting body copy inside a `<Dialog>` rendered below the title.',
  DialogFooter: 'Action row at the bottom of a `<Dialog>` — typically primary/secondary buttons.',
  DialogHeader: 'Top region of a `<Dialog>` that groups the title and description.',
  DialogOverlay:
    'Full-viewport scrim rendered behind an open `<Dialog>` to block background interaction.',
  DialogTitle: "Prominent title text at the top of a `<Dialog>` summarising the modal's purpose.",
  Divider: 'Thin horizontal or vertical rule used to separate logical sections of a layout.',
  useFormField:
    "Read-only context hook for form field children — returns the field's id, error state, and ARIA attributes.",
  ArrowIcon:
    'Directional arrow glyph (up / down / left / right) used by sortable headers, breadcrumbs, and toggles.',
  LabeledCard:
    'Card variant that pairs a tiny label above the body — used for compact stat or metadata blocks.',
  ListViewFilter:
    'Toolbar of dropdown/checkbox filters that drive a list view; emits the active filter set to the parent.',
  LogActivityIcon:
    'Status icon used inside `<LogRow>` to indicate event severity (info / warning / error / success).',
  LogDot: "Coloured dot used to mark a log event's severity or category inline with the row.",
  LogItem:
    'Compact log-line element rendering a single event with optional icon, timestamp, and message.',
  LogRow:
    'Single row of a logs feed — composes the dot/icon, timestamp, and message into one entry.',
  LogsCard: 'Card wrapper for a vertically scrolling logs feed with a sticky header.',
  NotFoundPage:
    'Full-page 404 view with a heading, supporting copy, and a primary call-to-action back to safety.',
  SimplePopover:
    'One-line convenience wrapper that pairs a trigger with floating content — no provider boilerplate.',
  SkeletonBlock:
    'Rectangular shimmer placeholder used to hint at content shape while data is loading.',
  TabsContent: 'Pane rendered when its matching `<TabsTrigger>` is active; hidden otherwise.',
  TabsList: 'Horizontal container holding the `<TabsTrigger>` buttons of a `<Tabs>` group.',
  TabsTrigger:
    'Single button inside `<TabsList>` that activates its corresponding `<TabsContent>` pane.',
  TagInput:
    'Text input that converts comma- or Enter-separated entries into removable tag chips below the field.',
  ToastProvider:
    'Headless provider that hosts the toast state machine — wrap your app with this plus a `<Toaster>` viewport.',
  BTC_SATS: 'Number of satoshis in one bitcoin (1e8). Used by unit conversion helpers.',
  HASHRATE_PER_PHS:
    'Hashrate units per petahash/second (1e15). Used by hashrate conversion helpers.',
  HOURS_IN_DAY: 'Number of hours in a calendar day (24). Used by duration helpers.',
  MS_PER_HOUR: 'Number of milliseconds in one hour (3.6e6). Used by duration conversion helpers.',
  SECONDS_PER_DAY:
    'Number of seconds in a calendar day (86400). Used by duration conversion helpers.',
  W_TO_MW: 'Watts per megawatt (1e6). Used by power conversion helpers.',
  AlarmContents:
    'Body region of an alarm card listing the alert details and recommended next actions.',
  AlarmRow:
    'Single alarm-feed row with severity dot, timestamp, source device, and the alert message.',
  AlertsTableTitle:
    'Title strip for an alerts table with the section heading and an optional count badge.',
  AlertConfirmationModal:
    'Modal that confirms acknowledging or clearing one or more alerts before applying the change.',
  TagFilterBar:
    'Horizontal strip of removable tag chips that narrow a list view; clicking a chip removes the filter.',
  BitMainImmersionSummaryBox:
    'Summary card for a BitMain immersion-cooled container: temps, pumps, power, and overall status.',
  ContainerCharts:
    'Tabbed chart panel showing per-container hashrate, power, and temperature time series.',
  ContainerControlsBox:
    'Control panel for a single container — start/stop, mode select, and operator actions.',
  EnabledDisableToggle:
    'Switch with confirmation that enables or disables a container, miner, or feature flag.',
  GenericDataBox:
    'Reusable labelled stat box used by container summary panels for one-off numeric values.',
  MicroBTWidgetBox:
    'Summary card for a MicroBT-equipped container showing pumps, fans, and operating mode.',
  MinersSummaryBox:
    'Headline card summarising miner counts by state (online, offline, faulted) for one container.',
  Socket:
    'Per-socket panel showing the miner slotted into a container slot, its state, and quick actions.',
  SupplyLiquidBox:
    'Status card for the dielectric supply tank — level, temperature, and pressure readings.',
  TankRow:
    'Single tank-list row used inside `<TanksBox>` to display per-tank temperature and pressure.',
  TanksBox:
    'Card listing all tanks inside an immersion container with per-tank temperature and pressure rows.',
  useGetAvailableDevices:
    'TanStack-Query hook returning the available device list filtered by the active site selection.',
  BitdeerOptions:
    'Options panel for a Bitdeer container — exposes vendor-specific operating modes and thresholds.',
  BitdeerPumps:
    'Pump telemetry panel for a Bitdeer container showing per-pump RPM, flow, and alert states.',
  BitdeerSettings:
    'Settings tab for a Bitdeer container — vendor-specific configuration controls and limits.',
  BitdeerTankPressureCharts:
    'Stacked time-series of dielectric tank pressure for a Bitdeer immersion container.',
  BitMainBasicSettings:
    'General settings form for a BitMain container — naming, location, and power limits.',
  BitMainControlsTab:
    'Controls tab for a BitMain container exposing start/stop, mode select, and emergency actions.',
  BitMainCoolingSystem:
    'Cooling subsystem panel for a BitMain container — pumps, fans, and dry-cooler status.',
  BitMainHydroSettings:
    'Settings form for a BitMain hydro-cooled container; flow, temperature, and pump configuration.',
  BitMainImmersionControlBox:
    'Control box for a BitMain immersion container exposing tank, pump, and unit-level actions.',
  BitMainImmersionPumpStationControlBox:
    'Pump-station control card for a BitMain immersion container with per-pump enable/disable.',
  BitMainImmersionSettings:
    'Settings form for a BitMain immersion container — tank thresholds, pump curves, and limits.',
  BitMainImmersionSystemStatus:
    'Aggregated system-status card for a BitMain immersion container; rolls up subsystem health.',
  BitMainImmersionUnitControlBox:
    'Per-unit control card inside a BitMain immersion container with start/stop and reset actions.',
  BitMainPowerAndPositioning:
    'Power and physical-positioning settings for a BitMain container — circuits, phases, and rack slots.',
  BitMainPowerCharts:
    'Time-series charts of per-phase power, voltage, and current draw for a BitMain container.',
  ContainerFanLegend:
    'Legend strip describing fan states and colours used by the container fans visualisation.',
  ContainerFansCard:
    'Card displaying the array of cooling fans in a container with live state per fan.',
  DryCooler: 'Dry-cooler subsystem panel showing inlet/outlet temperatures and fan-stage status.',
  GaugeChartComponent:
    'Single-needle gauge chart used inside container settings for thresholded percentage values.',
  MicroBTCooling:
    'Cooling subsystem panel for a MicroBT container — pumps, fans, and coolant flow telemetry.',
  MicroBTSettings: 'Settings form for a MicroBT container with vendor-specific operating limits.',
  PowerMeters: 'Per-circuit power-meter panel showing live kW, kWh, and power-factor readings.',
  PumpBox:
    'Single-pump status card with RPM, flow, and fault state for one immersion-cooling pump.',
  StatusItem:
    'Compact labelled status pill used inside container panels for boolean or enum readings.',
  BatchContainerControlsCard:
    'Bulk-controls card that applies start/stop/mode changes to multiple selected containers at once.',
  MinerChip:
    'Selectable chip representing a single miner; surfaces id, slot, and current state with click handling.',
  MinerChipsCard:
    'Card listing every miner in a container as `<MinerChip>`s for at-a-glance selection.',
  MinerControlsCard:
    'Action card for a single miner: power, reboot, mode select, and maintenance entry points.',
  MinerInfoCard:
    'Info card for one miner — serial, model, firmware, location, and recent activity summary.',
  MinerMetricCard:
    'Single-metric card (hashrate, temperature, or power) for one miner with sparkline and delta.',
  MinerPowerModeSelectionButtons:
    'Segmented control letting an operator switch a miner between low / normal / turbo power modes.',
  MinersActivityChart:
    'Stacked-area chart of miner-state counts (online / offline / faulted) over the selected window.',
  SecondaryStatCard:
    'Compact stat tile rendered alongside a primary stat to provide supporting context.',
  SingleStatCard:
    'Hero stat tile rendering one big number with a label and optional delta indicator.',
  StatsGroupCard:
    'Card grouping multiple `<SingleStatCard>`s or `<SecondaryStatCard>`s under a shared title.',
  AddReplaceMinerDialog:
    'Modal for adding a new miner to a slot or swapping the existing one with a replacement unit.',
  ContainerSelectionDialog:
    'Modal that lists containers and lets the operator pick one or many for a follow-up action.',
  MaintenanceDialogContent:
    'Body of the maintenance dialog — captures the work-order details before applying the maintenance flag.',
  PositionChangeDialog:
    'Modal that moves a miner to a different rack slot, validating the destination first.',
  RemoveMinerDialog:
    'Confirmation modal for removing a miner from a slot with an optional reason capture.',
  usePoolConfigs:
    'TanStack-Query hook returning the configured pools and their priorities for the current site.',
  useSiteOverviewDetailsData:
    'Composes the per-site overview view-model: pools, performance series, and recent activity.',
  ActualEbitdaCard:
    'Stat card summarising the realised EBITDA for the selected reporting window vs the prior period.',
  BitcoinPriceCard:
    'Stat card showing the BTC reference price used by the reporting view with currency and timestamp.',
  BitcoinProducedCard:
    'Stat card summarising the bitcoin produced during the reporting window with delta to prior period.',
  BitcoinProducedChart:
    'Time-series chart of bitcoin produced per day across the selected reporting window.',
  BitcoinProductionCostCard:
    'Stat card showing the average cost in USD to produce one bitcoin during the reporting window.',
  Ebitda:
    'Top-level EBITDA section of the reporting view — pulls together metric cards, charts, and tables.',
  EbitdaCharts:
    'Chart panel inside the EBITDA section visualising revenue, cost, and EBITDA over time.',
  EbitdaHodlCard:
    'Stat card projecting EBITDA assuming all produced bitcoin is held instead of sold.',
  EbitdaMetrics:
    'Row of summary metric cards across the top of the EBITDA section (actual, hodl, selling, cost).',
  EbitdaSellingCard:
    'Stat card projecting EBITDA assuming all produced bitcoin is sold at the daily reference price.',
  MonthlyEbitdaChart:
    'Bar chart comparing EBITDA across the most recent months for trend visualisation.',
  useEbitda:
    'TanStack-Query hook that fetches and aggregates the EBITDA series for the selected reporting window.',
  EfficiencyMinerTypeView:
    'Efficiency drilldown grouped by miner model — J/TH and uptime for each model in the fleet.',
  EfficiencyMinerUnitView:
    'Efficiency drilldown by individual miner serial — outliers and worst-performers surface here.',
  EfficiencySiteView:
    'Site-level efficiency view — site-aggregate J/TH, uptime, and capacity utilisation cards.',
  OperationsEfficiency:
    'Top-level operations-efficiency section of the report — composes the site/type/unit views.',
  ReportTimeFrameSelector:
    'Reporting-period selector with preset windows (7d / 30d / month-to-date / custom range).',
  useReportTimeFrameSelectorState:
    'State hook backing the reporting time-frame selector — exposes the active window and setters.',
  useFinancialDateRange:
    'Resolves the active financial date range (start/end) used by every reporting-section query.',
  AddUserModal:
    'Modal form for inviting a new user — captures email, role, and optional team assignment.',
  ChangeConfirmationModal:
    'Generic confirmation modal that shows a diff or summary of pending changes before applying them.',
  FeatureFlagsSettings:
    'Settings panel listing every feature flag with per-flag enable/disable toggle and description.',
  HeaderControlsSettings:
    'Settings panel for the global app header — toggle controls, sticky behaviour, and theme defaults.',
  useHeaderControls:
    'Read/write hook for the global header-controls store (toggles, sticky flag, theme).',
  ImportExportSettings:
    'Settings panel for exporting site configuration as JSON and importing a previously saved snapshot.',
  ManageUserModal: "Modal for editing an existing user's role, status, or team membership.",
  RBACControlSettings:
    'Settings panel listing roles and their permissions; supports editing role-permission grants.',
  SettingsDashboard:
    'Top-level settings landing page — composes the per-section settings cards in a single grid.',
  Alerts: 'Page-level alerts feature — composes the alerts table, filters, and confirmation modal.',
  PoolManagerMinerExplorer:
    'Pool-manager miner explorer page — table of miners filtered by pool with drilldown actions.',
  PoolManagerPools:
    'Pool-manager pools page — table of configured pools with status, priority, and edit actions.',
  PoolManagerSiteOverviewDetails:
    'Pool-manager site detail page — pools, recent activity, and performance for one site.',
  PoolManagerSitesOverview:
    'Pool-manager landing page listing every site with a snapshot of pools and current performance.',
  useListViewFilters:
    'Persistent filter-state hook for list views — syncs the active filter set to URL search params.',
  useUpdateExistedActions:
    'Mutation hook that updates only the changed fields of an existing action record.',
}

/**
 * Build the regex that matches the auto-generated placeholder JSDoc summary
 * for a given export `name`. The auto-tagger produces three shapes:
 *   - Multi-line: ` * Foo Bar Component.\n` (or `... Hook.`, `... Component`)
 *   - Single-line JSDoc: `/** Foo Bar Component. *\/`
 *   - "Use Foo hook." for hooks named useFoo.
 */
const splitName = (name) =>
  name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()

/**
 * Try multiple matchers; return the [pattern, kind] that hits, or null.
 */
const findPlaceholder = (content, name) => {
  const words = splitName(name).split(/\s+/).join('\\s+')
  const candidates = [
    // Multi-line star: ` * <Words> (Root )?(Component|Hook).`
    {
      kind: 'multi',
      re: new RegExp(
        `(^|\\n)([ \\t]*\\*[ \\t]+)${words}\\s+(?:Root\\s+)?(?:Component|component|Hook|hook)\\.?[ \\t]*(\\r?\\n)`,
        'm',
      ),
    },
    // Single-line JSDoc: `/** <Words> (Root )?Component. */`
    {
      kind: 'single',
      re: new RegExp(
        `/\\*\\*\\s*${words}\\s+(?:Root\\s+)?(?:Component|component|Hook|hook)\\.?\\s*\\*/`,
      ),
    },
    // `Use <Words-without-use> hook.`
    name.startsWith('use') && {
      kind: 'multi-use',
      re: new RegExp(
        `(^|\\n)([ \\t]*\\*[ \\t]+)Use\\s+${splitName(name.slice(3)).split(/\\s+/).join('\\s+')}\\s+(?:Hook|hook)\\.?[ \\t]*(\\r?\\n)`,
        'm',
      ),
    },
    name.startsWith('use') && {
      kind: 'single-use',
      re: new RegExp(
        `/\\*\\*\\s*Use\\s+${splitName(name.slice(3)).split(/\\s+/).join('\\s+')}\\s+(?:Hook|hook)\\.?\\s*\\*/`,
      ),
    },
    // For UPPER_SNAKE constants like BTC_SATS: " * Satoshis per Bitcoin\n" — also match the literal short description.
  ].filter(Boolean)

  for (const c of candidates) {
    const m = content.match(c.re)
    if (m) return { ...c, match: m }
  }
  return null
}

const sourceFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full)
    else if (
      /\.(?:tsx?|mts?)$/.test(entry) &&
      !entry.endsWith('.test.tsx') &&
      !entry.endsWith('.test.ts')
    )
      sourceFiles.push(full)
  }
}
walk(SRC_ROOT)

let totalReplacements = 0
const touchedFiles = new Set()
const stillMissing = []

for (const [name, newDesc] of Object.entries(DESCRIPTIONS)) {
  let foundInFile = null
  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8')
    // Must have a real declaration of `name` in this file to anchor on.
    const declRe = new RegExp(`\\b(?:const|function|let|var)\\s+${name}\\b`)
    if (!declRe.test(content)) continue
    const hit = findPlaceholder(content, name)
    if (!hit) continue

    let replacement
    if (hit.kind === 'single' || hit.kind === 'single-use') {
      replacement = `/**\n * ${newDesc}\n */`
    } else {
      // Multi-line shape — preserve leading indent and trailing newline.
      const leadStart = hit.match[1] ?? ''
      const lead = hit.match[2]
      const trail = hit.match[3]
      replacement = `${leadStart}${lead}${newDesc}${trail}`
    }
    const updated = content.replace(hit.re, replacement)
    if (updated !== content) {
      writeFileSync(file, updated, 'utf8')
      touchedFiles.add(file)
      totalReplacements += 1
      foundInFile = file
      break
    }
  }
  if (!foundInFile) stillMissing.push(name)
}

console.log(
  `✓ Replaced ${totalReplacements} placeholder descriptions across ${touchedFiles.size} files.`,
)
if (stillMissing.length) {
  console.log(`! ${stillMissing.length} entries could not be located automatically:`)
  for (const n of stillMissing) console.log(`  - ${n}`)
}
