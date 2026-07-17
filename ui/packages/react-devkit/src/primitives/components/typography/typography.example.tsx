/**
 * Runnable example for Typography.
 */
import { Typography } from '@tetherto/mdk-react-devkit'

export const TypographyExample = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Typography variant="heading1">Operations dashboard</Typography>
      <Typography variant="heading2">Sites</Typography>
      <Typography variant="heading3">Site #1</Typography>
      <Typography variant="body">
        A high-level summary of your sites, devices, and active alerts.
      </Typography>
      <Typography variant="secondary">Last refreshed 12 seconds ago.</Typography>
      <Typography variant="caption" color="muted">
        Updated 12s ago
      </Typography>
    </div>
  )
}
