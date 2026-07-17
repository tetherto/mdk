/**
 * Runnable example for Icons — a representative selection of exported icon components.
 */
import {
  AlertTriangleIcon,
  ArrowIcon,
  DashboardNavIcon,
  FanIcon,
  HashrateCardIcon,
  NotificationBellIcon,
  PowerIcon,
  SunnyIcon,
} from '@tetherto/mdk-react-devkit'

const IconRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>{children}</div>
)

const IconSample = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    {children}
    <span style={{ fontSize: 11, color: 'var(--mdk-color-text-secondary, #888)' }}>{label}</span>
  </div>
)

export const IconsExample = () => (
  <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {/* Default size (24px) */}
    <IconRow>
      <IconSample label="DashboardNavIcon">
        <DashboardNavIcon />
      </IconSample>
      <IconSample label="AlertTriangleIcon">
        <AlertTriangleIcon />
      </IconSample>
      <IconSample label="HashrateCardIcon">
        <HashrateCardIcon />
      </IconSample>
      <IconSample label="FanIcon">
        <FanIcon />
      </IconSample>
      <IconSample label="SunnyIcon">
        <SunnyIcon />
      </IconSample>
      <IconSample label="ArrowIcon">
        <ArrowIcon />
      </IconSample>
      <IconSample label="NotificationBellIcon">
        <NotificationBellIcon />
      </IconSample>
      <IconSample label="PowerIcon">
        <PowerIcon />
      </IconSample>
    </IconRow>

    {/* Custom sizes */}
    <IconRow>
      <IconSample label="size=16">
        <DashboardNavIcon size={16} />
      </IconSample>
      <IconSample label="size=24">
        <DashboardNavIcon size={24} />
      </IconSample>
      <IconSample label="size=32">
        <DashboardNavIcon size={32} />
      </IconSample>
    </IconRow>

    {/* Custom colours */}
    <IconRow>
      <IconSample label="default color">
        <AlertTriangleIcon size={24} />
      </IconSample>
      <IconSample label="color=#FF9500">
        <AlertTriangleIcon size={24} color="#FF9500" />
      </IconSample>
      <IconSample label="color=#4ADE80">
        <AlertTriangleIcon size={24} color="#4ADE80" />
      </IconSample>
      <IconSample label="color=#F87171">
        <AlertTriangleIcon size={24} color="#F87171" />
      </IconSample>
    </IconRow>
  </div>
)
