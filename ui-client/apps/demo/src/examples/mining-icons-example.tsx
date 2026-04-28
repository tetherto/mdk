import { useState } from 'react'
import {
  ActionsTickIcon,
  AlertsNavIcon,
  AlertTriangleIcon,
  BtcCardIcon,
  CabinetWidgetNavIcon,
  CloudyIcon,
  CommentIcon,
  CommentIconCommon,
  ConsumptionIcon,
  ContainerWidgetsNavIcon,
  CoolingDropIcon,
  // Sidebar
  DashboardNavIcon,
  DecreaseIcon,
  EfficiencyIcon,
  ErrorStatusIcon,
  ExplorerNavIcon,
  // Other
  ExportIcon,
  FanIcon,
  // Farm stats
  FarmAlertIcon,
  FarmsNavIcon,
  FarmStarIcon,
  FinancialsNavIcon,
  // Container alarms
  FluidAlarmIcon,
  FrequencyIcon,
  // Brand
  GoogleIcon,
  // Miner card
  HashrateCardIcon,
  HashrateStatIcon,
  // Percentage
  IncreaseIcon,
  InventoryNavIcon,
  LiveIcon,
  MenuIcon,
  MinerExplorerIcon,
  MinersOverviewNavIcon,
  MinersStatIcon,
  // Miner status
  MiningStatusIcon,
  ModeIcon,
  // Header
  NotificationBellIcon,
  OfflineAlarmIcon,
  OfflineStatusIcon,
  OperationsNavIcon,
  OtherAlarmIcon,
  PartlyCloudyIcon,
  // Shared
  PinIcon,
  PoolManagerNavIcon,
  PoolsIcon,
  PowerIcon,
  PressureAlarmIcon,
  ProductionDataIcon,
  ProfitArrowIcon,
  RainThunderIcon,
  RainyIcon,
  ReportingNavIcon,
  RightArrowIcon,
  RightNavigateIcon,
  ScaleControlIcon,
  SettingsHeaderIcon,
  SettingsNavIcon,
  SignOutIcon,
  SiteOverviewIcon,
  SleepStatusIcon,
  SnowyIcon,
  SunnyIcon,
  TemperatureAlarmIcon,
  TemperatureCelsiusIcon,
  TemperatureIndicatorIcon,
  // Weather
  TemperatureWeatherIcon,
  UnPinIcon,
  UserAvatarIcon,
  UserManagementNavIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from '@tetherto/core'

import { DemoPageHeader } from '../components/demo-page-header'

type IconEntry = {
  name: string
  component: React.ComponentType<{
    size?: number | string
    width?: number | string
    height?: number | string
    color?: string
  }>
  multiColor?: boolean
}

const ICON_CATEGORIES: { title: string; icons: IconEntry[] }[] = [
  {
    title: 'Sidebar Navigation',
    icons: [
      { name: 'DashboardNavIcon', component: DashboardNavIcon },
      { name: 'ExplorerNavIcon', component: ExplorerNavIcon },
      { name: 'AlertsNavIcon', component: AlertsNavIcon },
      { name: 'CabinetWidgetNavIcon', component: CabinetWidgetNavIcon },
      { name: 'ContainerWidgetsNavIcon', component: ContainerWidgetsNavIcon },
      { name: 'FarmsNavIcon', component: FarmsNavIcon },
      { name: 'FinancialsNavIcon', component: FinancialsNavIcon },
      { name: 'InventoryNavIcon', component: InventoryNavIcon },
      { name: 'MinersOverviewNavIcon', component: MinersOverviewNavIcon },
      { name: 'OperationsNavIcon', component: OperationsNavIcon },
      { name: 'PoolManagerNavIcon', component: PoolManagerNavIcon },
      { name: 'ReportingNavIcon', component: ReportingNavIcon },
      { name: 'SettingsNavIcon', component: SettingsNavIcon },
      { name: 'UserManagementNavIcon', component: UserManagementNavIcon },
    ],
  },
  {
    title: 'Shared',
    icons: [
      { name: 'PinIcon', component: PinIcon },
      { name: 'UnPinIcon', component: UnPinIcon },
      { name: 'CommentIcon', component: CommentIcon },
      { name: 'CommentIconCommon', component: CommentIconCommon, multiColor: true },
      { name: 'RightNavigateIcon', component: RightNavigateIcon },
      { name: 'RightArrowIcon', component: RightArrowIcon },
      { name: 'ProductionDataIcon', component: ProductionDataIcon, multiColor: true },
    ],
  },
  {
    title: 'Farm Stats',
    icons: [
      { name: 'FarmAlertIcon', component: FarmAlertIcon },
      { name: 'ConsumptionIcon', component: ConsumptionIcon },
      { name: 'EfficiencyIcon', component: EfficiencyIcon },
      { name: 'FrequencyIcon', component: FrequencyIcon },
      { name: 'HashrateStatIcon', component: HashrateStatIcon },
      { name: 'MinersStatIcon', component: MinersStatIcon },
      { name: 'TemperatureCelsiusIcon', component: TemperatureCelsiusIcon },
    ],
  },
  {
    title: 'Miner Status',
    icons: [
      { name: 'MiningStatusIcon', component: MiningStatusIcon, multiColor: true },
      { name: 'ErrorStatusIcon', component: ErrorStatusIcon },
      { name: 'OfflineStatusIcon', component: OfflineStatusIcon },
      { name: 'SleepStatusIcon', component: SleepStatusIcon },
    ],
  },
  {
    title: 'Miner Card',
    icons: [
      { name: 'HashrateCardIcon', component: HashrateCardIcon },
      { name: 'AlertTriangleIcon', component: AlertTriangleIcon },
      { name: 'BtcCardIcon', component: BtcCardIcon, multiColor: true },
      { name: 'CoolingDropIcon', component: CoolingDropIcon },
      { name: 'PowerIcon', component: PowerIcon },
      { name: 'TemperatureIndicatorIcon', component: TemperatureIndicatorIcon },
    ],
  },
  {
    title: 'Percentage',
    icons: [
      { name: 'IncreaseIcon', component: IncreaseIcon },
      { name: 'DecreaseIcon', component: DecreaseIcon },
    ],
  },
  {
    title: 'Container Alarms',
    icons: [
      { name: 'FluidAlarmIcon', component: FluidAlarmIcon, multiColor: true },
      { name: 'OfflineAlarmIcon', component: OfflineAlarmIcon },
      { name: 'OtherAlarmIcon', component: OtherAlarmIcon, multiColor: true },
      { name: 'PressureAlarmIcon', component: PressureAlarmIcon, multiColor: true },
      { name: 'TemperatureAlarmIcon', component: TemperatureAlarmIcon, multiColor: true },
    ],
  },
  {
    title: 'Weather',
    icons: [
      { name: 'TemperatureWeatherIcon', component: TemperatureWeatherIcon, multiColor: true },
      { name: 'PartlyCloudyIcon', component: PartlyCloudyIcon, multiColor: true },
      { name: 'CloudyIcon', component: CloudyIcon, multiColor: true },
      { name: 'RainThunderIcon', component: RainThunderIcon, multiColor: true },
      { name: 'RainyIcon', component: RainyIcon, multiColor: true },
      { name: 'SnowyIcon', component: SnowyIcon, multiColor: true },
      { name: 'SunnyIcon', component: SunnyIcon, multiColor: true },
    ],
  },
  {
    title: 'Header',
    icons: [
      { name: 'NotificationBellIcon', component: NotificationBellIcon },
      { name: 'VolumeOnIcon', component: VolumeOnIcon },
      { name: 'VolumeOffIcon', component: VolumeOffIcon },
      { name: 'ModeIcon', component: ModeIcon },
      { name: 'SettingsHeaderIcon', component: SettingsHeaderIcon },
      { name: 'SignOutIcon', component: SignOutIcon },
      { name: 'UserAvatarIcon', component: UserAvatarIcon },
      { name: 'ActionsTickIcon', component: ActionsTickIcon },
    ],
  },
  {
    title: 'Brand',
    icons: [{ name: 'GoogleIcon', component: GoogleIcon, multiColor: true }],
  },
  {
    title: 'Other',
    icons: [
      { name: 'ExportIcon', component: ExportIcon },
      { name: 'MenuIcon', component: MenuIcon },
      { name: 'ProfitArrowIcon', component: ProfitArrowIcon },
      { name: 'FarmStarIcon', component: FarmStarIcon },
      { name: 'ScaleControlIcon', component: ScaleControlIcon },
      { name: 'MinerExplorerIcon', component: MinerExplorerIcon },
      { name: 'PoolsIcon', component: PoolsIcon },
      { name: 'SiteOverviewIcon', component: SiteOverviewIcon },
      { name: 'LiveIcon', component: LiveIcon, multiColor: true },
      { name: 'FanIcon', component: FanIcon, multiColor: true },
    ],
  },
]

const SIZES = [16, 24, 32, 48]

const iconCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.05)',
  minWidth: '100px',
}

const iconNameStyle: React.CSSProperties = {
  fontSize: '10px',
  opacity: 0.6,
  textAlign: 'center',
  wordBreak: 'break-all',
}

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginBottom: '24px',
}

const categoryTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '12px',
  opacity: 0.8,
}

export const MiningIconsExample = (): JSX.Element => {
  const [selectedSize, setSelectedSize] = useState(24)
  const [customColor, setCustomColor] = useState('#F7931A')

  return (
    <section className="demo-section">
      <DemoPageHeader title="Mining Icons" />
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <label style={{ fontSize: '14px' }}>
          Size:
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(Number(e.target.value))}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
            }}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '14px' }}>
          Color (single-color icons):
          <input
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            style={{ marginLeft: '8px', verticalAlign: 'middle' }}
          />
          <span style={{ marginLeft: '4px', opacity: 0.6 }}>{customColor}</span>
        </label>
      </div>

      {/* Icon grid by category */}
      {ICON_CATEGORIES.map((category) => (
        <div key={category.title}>
          <h3 style={categoryTitleStyle}>{category.title}</h3>
          <div style={gridStyle}>
            {category.icons.map(({ name, component: Icon, multiColor }) => (
              <div key={name} style={iconCellStyle}>
                <Icon
                  size={multiColor ? selectedSize : undefined}
                  width={multiColor ? undefined : selectedSize}
                  height={multiColor ? undefined : selectedSize}
                  color={multiColor ? undefined : customColor}
                />
                <span style={iconNameStyle}>{name}</span>
                {multiColor && <span style={{ fontSize: '9px', opacity: 0.4 }}>multi-color</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Size comparison */}
      <h3 style={categoryTitleStyle}>Size Comparison</h3>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'end', marginBottom: '24px' }}>
        {SIZES.map((size) => (
          <div key={size} style={{ ...iconCellStyle, minWidth: 'auto' }}>
            <DashboardNavIcon size={size} color={customColor} />
            <span style={iconNameStyle}>{size}px</span>
          </div>
        ))}
      </div>
    </section>
  )
}
