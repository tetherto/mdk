# Icons

A collection of domain-specific SVG icon components plus the `createIcon` factory for authoring new icons. All icons share a consistent `IconProps` interface and are built with `React.forwardRef`.

## `IconProps`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `size` | `number \| string` | no | — | Sets both `width` and `height` |
| `color` | `string` | no | `'currentColor'` | Fill/stroke color (only affects single-color icons) |
| `width` | `number \| string` | no | icon default | Override width independently |
| `height` | `number \| string` | no | icon default | Override height independently |

All other `SVGAttributes<SVGElement>` props are forwarded to the `<svg>` element.

## Available Icons

Sidebar navigation: `DashboardNavIcon`, `AlertsNavIcon`, `FarmsNavIcon`, `ExplorerNavIcon`, `FinancialsNavIcon`, `InventoryNavIcon`, `MinersOverviewNavIcon`, `OperationsNavIcon`, `PoolManagerNavIcon`, `ReportingNavIcon`, `SettingsNavIcon`, `UserManagementNavIcon`, `CabinetWidgetNavIcon`, `ContainerWidgetsNavIcon`

Status / alarm: `ErrorStatusIcon`, `OfflineStatusIcon`, `SleepStatusIcon`, `MiningStatusIcon`, `FluidAlarmIcon`, `OfflineAlarmIcon`, `OtherAlarmIcon`, `PressureAlarmIcon`, `TemperatureAlarmIcon`, `AlertTriangleIcon`

Miner card / stats: `HashrateCardIcon`, `HashrateStatIcon`, `MinersStatIcon`, `BtcCardIcon`, `EfficiencyIcon`, `FrequencyIcon`, `FanIcon`, `PowerIcon`, `ConsumptionIcon`, `ModeIcon`, `TemperatureIndicatorIcon`, `TemperatureCelsiusIcon`

Weather: `CloudyIcon`, `PartlyCloudyIcon`, `RainThunderIcon`, `RainyIcon`, `SnowyIcon`, `SunnyIcon`, `TemperatureWeatherIcon`

Navigation / UI: `ArrowIcon`, `RightArrowIcon`, `RightNavigateIcon`, `MenuIcon`, `PinIcon`, `UnPinIcon`, `ExportIcon`, `ScaleControlIcon`, `NotificationBellIcon`, `SettingsHeaderIcon`, `SignOutIcon`, `LiveIcon`

Misc: `ActionsTickIcon`, `CommentIcon`, `CommentIconCommon`, `CoolingDropIcon`, `DecreaseIcon`, `IncreaseIcon`, `FarmAlertIcon`, `FarmStarIcon`, `GoogleIcon`, `MinerExplorerIcon`, `MinerOverviewIcon`, `SiteOverviewIcon`, `UserAvatarIcon`, `VolumeOffIcon`, `VolumeOnIcon`, `ProfitArrowIcon`, `ProductionDataIcon`, `PoolsIcon`

## `createIcon` factory

Use `createIcon` to define new SVG icons that automatically follow the `IconProps` interface.

### `CreateIconOptions`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `displayName` | `string` | yes | Component display name |
| `viewBox` | `string` | yes | SVG viewBox |
| `defaultWidth` | `number` | no | Default width (defaults to `24`) |
| `defaultHeight` | `number` | no | Default height (defaults to `24`) |
| `multiColor` | `boolean` | no | When `true`, disables single-color fill |
| `path` | `ReactNode \| ((props: { color: string }) => ReactNode)` | yes | SVG path(s) |

## Example

```tsx
import { DashboardNavIcon, ArrowIcon, createIcon } from "@tetherto/mdk-core-ui"

// Using a built-in icon
<DashboardNavIcon size={20} />
<ArrowIcon color="#FF9500" width={16} height={16} />

// Creating a custom icon
const StarIcon = createIcon({
  displayName: "StarIcon",
  viewBox: "0 0 24 24",
  path: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />,
})

<StarIcon size={24} color="gold" />
```
