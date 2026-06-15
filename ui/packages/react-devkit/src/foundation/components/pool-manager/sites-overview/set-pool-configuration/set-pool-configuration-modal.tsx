import { Dialog, DialogContent } from '@core'

import type { PoolConfigData } from '../../hooks/use-pool-configs'
import type { PoolSummary } from '../../types'
import { SetPoolConfiguration } from './set-pool-configuration'

// TODO: Replace <Dialog> with a Sidebar/Sheet component once it is implemented in @tetherto/mdk-core-ui.
//       The original app implementation used a fixed right-side drawer (SidebarModal from antd).
//       When a Sheet or Drawer component is available in core, this modal should slide in from
//       the right instead of appearing as a centered dialog.

export type SetPoolConfigurationModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: { pool: PoolSummary }) => Promise<void> | void
  poolConfig: PoolConfigData[]
}

export const SetPoolConfigurationModal = ({
  isOpen,
  onClose,
  onSubmit,
  poolConfig,
}: SetPoolConfigurationModalProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      title="Selected Units"
      closable
      onClose={onClose}
      closeOnClickOutside={false}
      className="mdk-pm-set-pool-modal"
    >
      <SetPoolConfiguration onSubmit={onSubmit} poolConfig={poolConfig} />
    </DialogContent>
  </Dialog>
)
