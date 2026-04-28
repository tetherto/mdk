import type { ReactElement, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { Button, Dialog, DialogContent } from '@tetherto/mdk-core-ui'
import {
  actionsSlice,
  AddReplaceMinerDialog,
  ContainerSelectionDialog,
  MAINTENANCE_CONTAINER,
  MaintenanceDialogContent,
  POSITION_CHANGE_DIALOG_FLOWS,
  PositionChangeDialog,
  RemoveMinerDialog,
} from '@tetherto/mdk-foundation-ui'

import { DemoBlock } from '../../../components/demo-block'
import { DemoPageHeader } from '../../../components/demo-page-header'
import './fleet-management-demo.scss'

/**
 * Fleet Management Demo
 *
 * Standalone demos for each of the five publicly exported dialog components
 * from `@tetherto/mdk-foundation-ui`'s `explorer/dialogs` barrel. Each block provides
 * its own minimal Redux store so dialogs that dispatch actions (e.g.
 * MaintenanceDialogContent, RemoveMinerDialog) work in isolation.
 */

type MinerOverrides = Record<string, unknown>

const makeMiner = (overrides: MinerOverrides = {}) => ({
  id: 'miner-1',
  model: 'Whatsminer M50',
  type: 'miner-wm',
  rack: 'rack-001',
  code: 'M-SNOW-01',
  tags: ['Production'],
  info: {
    pos: 'A1',
    container: 'CON-BBR-01',
    macAddress: 'aa:bb:cc:dd:ee:ff',
    serialNum: 'SN-12345',
  },
  last: {
    snap: {
      config: { led_status: false, power_mode: 'Normal' },
      stats: {
        miner_specific: { upfreq_speed: 1 },
        status: 'sleeping',
      },
    },
  },
  ...overrides,
})

const createDemoStore = () =>
  configureStore({
    reducer: {
      actions: actionsSlice.reducer,
      devices: () => ({ selectedDevices: [] }),
    },
    devTools: false,
  })

type DialogDemoBlockProps = {
  title: string
  description: string
  triggerLabel?: string
  children: (state: { open: boolean; close: () => void }) => ReactNode
}

/**
 * Wraps each dialog in its own Provider + controlled-open state, exposing
 * an `open` flag and `close` callback to the render-prop child.
 */
const DialogDemoBlock = ({
  title,
  description,
  triggerLabel = 'Open dialog',
  children,
}: DialogDemoBlockProps): ReactElement => {
  const [open, setOpen] = useState(false)
  const [openCount, setOpenCount] = useState(0)
  const store = useMemo(() => createDemoStore(), [])

  const handleOpen = () => {
    setOpenCount((n) => n + 1)
    setOpen(true)
  }
  const close = () => setOpen(false)

  return (
    <DemoBlock title={title} description={description} className="fleet-management-demo__section">
      <Provider store={store}>
        <Button onClick={handleOpen}>{triggerLabel}</Button>
        {/* Remount the dialog subtree on each open so dialogs that cache
            internal flow state (e.g. PositionChangeDialog) re-initialize
            cleanly from their props. */}
        <div key={openCount}>{children({ open, close })}</div>
      </Provider>
    </DemoBlock>
  )
}

const MINER_FIXTURE = makeMiner()
const MINER_IN_MAINTENANCE = makeMiner({
  info: {
    pos: 'A1',
    container: MAINTENANCE_CONTAINER,
    macAddress: 'aa:bb:cc:dd:ee:ff',
  },
})

const editSocketFor = (miner: ReturnType<typeof makeMiner>) => ({
  miner,
  containerInfo: { container: miner.info.container },
})

export const FleetManagementDemo = (): ReactElement => {
  return (
    <div className="fleet-management-demo">
      <DemoPageHeader
        title="Fleet Management"
        description="Standalone demos for the five publicly exported dialog components from explorer/dialogs: Position Change Dialog, Container Selection Dialog, Maintenance Dialog Content, Remove Miner Dialog and Add Replace Miner Dialog."
      />

      <div className="fleet-management-demo__examples">
        {/* PositionChangeDialog ─ four flows */}

        <DialogDemoBlock
          title="Position Change Dialog — Change Info"
          description="dialogFlow=changeInfo. Edits info of an existing miner in place."
        >
          {({ open, close }) => (
            <PositionChangeDialog
              open={open}
              onClose={close}
              dialogFlow={POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO}
              selectedEditSocket={editSocketFor(MINER_FIXTURE)}
            />
          )}
        </DialogDemoBlock>

        <DialogDemoBlock
          title="Position Change Dialog — Maintenance"
          description="dialogFlow=maintenance. Confirms moving a miner into the maintenance container."
        >
          {({ open, close }) => (
            <PositionChangeDialog
              open={open}
              onClose={close}
              dialogFlow={POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE}
              selectedEditSocket={editSocketFor(MINER_FIXTURE)}
            />
          )}
        </DialogDemoBlock>

        <DialogDemoBlock
          title="Position Change Dialog — Replace Miner"
          description="dialogFlow=replaceMiner. Title falls through to the generic position-change copy."
        >
          {({ open, close }) => (
            <PositionChangeDialog
              open={open}
              onClose={close}
              dialogFlow={POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER}
              selectedEditSocket={editSocketFor(MINER_FIXTURE)}
            />
          )}
        </DialogDemoBlock>

        <DialogDemoBlock
          title="Position Change Dialog — Container Selection"
          description="dialogFlow=containerSelection. Used when picking a destination container for a move."
        >
          {({ open, close }) => (
            <PositionChangeDialog
              open={open}
              onClose={close}
              dialogFlow={POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION}
              selectedSocketToReplace={editSocketFor(MINER_FIXTURE)}
            />
          )}
        </DialogDemoBlock>

        {/* ContainerSelectionDialog */}

        <DialogDemoBlock
          title="Container Selection Dialog — Default"
          description="Picks the destination container when bringing a miner back from maintenance."
        >
          {({ open, close }) => (
            <ContainerSelectionDialog open={open} onClose={close} miner={MINER_IN_MAINTENANCE} />
          )}
        </DialogDemoBlock>

        <DialogDemoBlock
          title="Container Selection Dialog — Loading"
          description="isLoading=true while the container list is being fetched."
        >
          {({ open, close }) => (
            <ContainerSelectionDialog
              open={open}
              onClose={close}
              miner={MINER_IN_MAINTENANCE}
              isLoading
            />
          )}
        </DialogDemoBlock>

        {/* MaintenanceDialogContent — exported standalone, hosted in a Dialog shell */}

        <DialogDemoBlock
          title="Maintenance Dialog Content (standalone)"
          description="Exported independently from Position Change Dialog so consumers can host it in a custom Dialog shell."
        >
          {({ open, close }) => (
            <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
              <DialogContent title="Move miner to maintenance" onClose={close} closable>
                <MaintenanceDialogContent
                  selectedEditSocket={editSocketFor(MINER_FIXTURE)}
                  onCancel={close}
                />
              </DialogContent>
            </Dialog>
          )}
        </DialogDemoBlock>

        {/* RemoveMinerDialog */}

        <DialogDemoBlock
          title="Remove Miner Dialog"
          description="Confirms forgetting/removing a miner from the fleet."
        >
          {({ open, close }) => (
            <RemoveMinerDialog
              headDevice={MINER_IN_MAINTENANCE}
              isRemoveMinerFlow={open}
              onCancel={close}
            />
          )}
        </DialogDemoBlock>

        {/* AddReplaceMinerDialog ─ two flows */}

        <DialogDemoBlock
          title="Add Replace Miner Dialog — Change Info"
          description="currentDialogFlow=changeInfo. Edits the miner's identifying fields."
        >
          {({ open, close }) => (
            <AddReplaceMinerDialog
              open={open}
              onClose={close}
              selectedEditSocket={{ miner: MINER_FIXTURE }}
              currentDialogFlow={POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO}
            />
          )}
        </DialogDemoBlock>

        <DialogDemoBlock
          title="Add Replace Miner Dialog — Replace Miner"
          description="currentDialogFlow=replaceMiner. Replaces an existing miner with a new one."
        >
          {({ open, close }) => (
            <AddReplaceMinerDialog
              open={open}
              onClose={close}
              selectedEditSocket={{ miner: MINER_FIXTURE }}
              currentDialogFlow={POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER}
            />
          )}
        </DialogDemoBlock>
      </div>
    </div>
  )
}
