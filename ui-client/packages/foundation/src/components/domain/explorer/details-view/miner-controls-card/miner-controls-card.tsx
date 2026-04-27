import type { UnknownRecord } from '@mdk/core'
import { Button, SimpleTooltip, Spinner } from '@mdk/core'
import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../constants/actions'
import { MAINTENANCE_CONTAINER } from '../../../../../constants/container-constants'
import { CROSS_THING_TYPES } from '../../../../../constants/devices'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../constants/dialog'
import { useNotification } from '../../../../../hooks'
import type { PendingSubmission } from '../../../../../hooks/use-update-existed-actions'
import { useUpdateExistedActions } from '../../../../../hooks/use-update-existed-actions'
import { actionsSlice, selectSelectedDevices } from '../../../../../state'
import type { Device } from '../../../../../types'
import { getSelectedDevicesTags } from '../../../../../utils/action-utils'
import { appendIdToTag, getOnOffText, isMiner } from '../../../../../utils/device-utils'
import {
  AddReplaceMinerDialog,
  ContainerSelectionDialog,
  PositionChangeDialog,
  RemoveMinerDialog,
} from '../../dialogs'
import { MinerPowerModeSelectionButtons } from '../miner-power-mode-selection-buttons/miner-power-mode-selection-buttons'
import { MinerSetupFrequencyDropdown } from '../miner-setup-frequency-dropdown/miner-setup-frequency-dropdown'
import './miner-controls-card.scss'
import { getLedButtonsStatus } from './miner-controls-utils'

const { setAddPendingSubmissionAction } = actionsSlice.actions

type MinerControlsCardProps = {
  buttonsStates: Record<string, boolean | undefined>
  isLoading: boolean
  showPowerModeSelector?: boolean
}

export const MinerControlsCard = ({
  buttonsStates,
  isLoading,
  showPowerModeSelector = true,
}: MinerControlsCardProps) => {
  const { notifyInfo } = useNotification()
  const dispatch = useDispatch()
  const pendingSubmissions = useSelector(actionsSlice.selectors.selectPendingSubmissions)
  const storedSelectedDevices = useSelector(selectSelectedDevices) as Device[]
  const { updateExistedActions } = useUpdateExistedActions()

  const selectedDevices = storedSelectedDevices.filter(
    (device) => isMiner(device.type) && device.id !== undefined,
  )
  const headDevice = selectedDevices[0]
  const deviceSelectionSize = selectedDevices.length
  const minersInMaintenance = selectedDevices.filter(
    (d) => d.info?.container === MAINTENANCE_CONTAINER,
  ).length

  const isDeviceInMaintenance = headDevice?.info?.container === MAINTENANCE_CONTAINER
  const isSingleDeviceInMaintenance = minersInMaintenance === 1 && deviceSelectionSize === 1
  const hasMacAddress = !!headDevice?.info?.macAddress

  const [isContainerSelectionFlow, setIsContainerSelectionFlow] = React.useState(false)
  const [isRemoveMinerFlow, setIsRemoveMinerFlow] = React.useState(false)
  const [isChangeInfoDialogOpen, setIsChangeInfoDialogOpen] = React.useState(false)
  const [minerDialogFlow, setMinerDialogFlow] = React.useState<string | null>(null)

  const { isLedOnButtonEnabled, isLedOffButtonEnabled } = getLedButtonsStatus(selectedDevices)

  const getDevicesTags = (devices: Device[]) =>
    devices.map((device: UnknownRecord) => appendIdToTag(device.id as string))

  const getDevicesContainerInfo = (devices: Device[]) =>
    devices.map((device) => device?.info?.container)

  const rebootMiner = () => {
    const selectedDevicesTags = getSelectedDevicesTags(selectedDevices)
    updateExistedActions({
      actionType: ACTION_TYPES.REBOOT,
      pendingSubmissions: pendingSubmissions as any[],
      selectedDevices,
    })
    const codesList = selectedDevices.map((d) => d.code).filter(Boolean)
    dispatch(
      setAddPendingSubmissionAction({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: ACTION_TYPES.REBOOT,
        tags: selectedDevicesTags,
        params: [],
        codesList,
      }),
    )
    notifyInfo('Action added', `Reboot ${codesList.join(', ')}`)
  }

  const setUpFrequencySettings = (frequency: string | number) => {
    const freq = Number(frequency)
    const selectedDevicesTags = getDevicesTags(selectedDevices)

    updateExistedActions({
      actionType: ACTION_TYPES.SETUP_FREQUENCY_SPEED,
      pendingSubmissions: pendingSubmissions as unknown as PendingSubmission[],
      selectedDevices: selectedDevices as unknown as Device[],
    })

    dispatch(
      setAddPendingSubmissionAction({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: ACTION_TYPES.SETUP_FREQUENCY_SPEED,
        tags: selectedDevicesTags,
        params: [freq],
        crossThing: {
          type: CROSS_THING_TYPES.CONTAINER,
          params: {
            containers: getDevicesContainerInfo(selectedDevices),
          },
        },
      }),
    )
    notifyInfo(
      'Action added',
      `Set Up Frequency Settings ${freq} to ${deviceSelectionSize} devices`,
    )
  }

  const setPowerMode = (devices: Device[], powerMode: string) => {
    const changedDevices = devices.filter(
      (selectedDevice) => selectedDevice.last?.snap?.config?.power_mode !== powerMode,
    )

    if (changedDevices.length === 0) {
      notifyInfo('No actions added', 'No devices power mode affected by the action')
    } else {
      const selectedDevicesTags = getDevicesTags(changedDevices)
      updateExistedActions({
        actionType: ACTION_TYPES.SET_POWER_MODE,
        pendingSubmissions: pendingSubmissions as PendingSubmission[],
        selectedDevices: selectedDevices as Device[],
      })

      dispatch(
        setAddPendingSubmissionAction({
          type: SUBMIT_ACTION_TYPES.VOTING,
          action: ACTION_TYPES.SET_POWER_MODE,
          tags: selectedDevicesTags,
          params: [powerMode],
          crossThing: {
            type: CROSS_THING_TYPES.CONTAINER,
            params: {
              containers: getDevicesContainerInfo(devices),
            },
          },
        }),
      )
      notifyInfo('Action added', `Set Power Mode ${powerMode} to ${changedDevices.length} devices`)
    }
  }

  const setLed = (isOn: boolean) => {
    const changedDevices = selectedDevices.filter((d) => d.last?.snap?.config?.led_status !== isOn)
    if (changedDevices.length === 0)
      return notifyInfo('No actions added', 'No devices LEDs affected')

    updateExistedActions({
      actionType: ACTION_TYPES.SET_LED,
      pendingSubmissions: pendingSubmissions as any[],
      selectedDevices,
    })
    dispatch(
      setAddPendingSubmissionAction({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: ACTION_TYPES.SET_LED,
        tags: changedDevices.map((d) => appendIdToTag(d.id)),
        params: [isOn],
      }),
    )
    notifyInfo('Action added', `Set LED ${getOnOffText(isOn)}`)
  }

  if (minersInMaintenance > 1 && deviceSelectionSize === minersInMaintenance) return null

  return (
    <div className="mdk-miner-controls">
      <div className="mdk-miner-controls__label">Miner Controls</div>

      <div className="mdk-miner-controls__content">
        {isLoading && <Spinner className="mdk-miner-controls__loader" />}

        {isSingleDeviceInMaintenance && isDeviceInMaintenance ? (
          <div className="mdk-miner-controls__maintenance-stack">
            <Button onClick={() => setIsChangeInfoDialogOpen(true)}>Change Miner Info</Button>
            <SimpleTooltip content={!hasMacAddress && 'Please add a mac address'}>
              <Button
                disabled={isLoading || !hasMacAddress}
                onClick={() => setIsContainerSelectionFlow(true)}
              >
                Back from Maintenance
              </Button>
            </SimpleTooltip>
            <Button variant="danger" onClick={() => setIsRemoveMinerFlow(true)}>
              Remove Miner
            </Button>
          </div>
        ) : (
          <div className="mdk-miner-controls__grid">
            {showPowerModeSelector && (
              <div className="mdk-miner-controls__full-width">
                <MinerPowerModeSelectionButtons
                  disabled={isLoading}
                  selectedDevices={selectedDevices}
                  setPowerMode={setPowerMode}
                />
              </div>
            )}

            <div className="mdk-miner-controls__full-width">
              <Button variant="danger" onClick={rebootMiner} disabled={isLoading}>
                Reboot
              </Button>
            </div>

            <div className="mdk-miner-controls__full-width">
              <MinerSetupFrequencyDropdown
                disabled={buttonsStates.isSetUpFrequencyButtonDisabled || isLoading}
                onFrequencyToggle={setUpFrequencySettings}
                buttonText="Setup Freq. Settings"
                selectedFrequency={[
                  String(headDevice?.last?.snap?.stats?.miner_specific?.upfreq_speed ?? ''),
                ]}
              />
            </div>

            <Button
              className="mdk-miner-controls__full-width"
              disabled={!isLedOnButtonEnabled || isLoading}
              onClick={() => setLed(true)}
            >
              LEDs on
            </Button>
            <Button
              className="mdk-miner-controls__full-width"
              disabled={!isLedOffButtonEnabled || isLoading}
              onClick={() => setLed(false)}
            >
              LEDs off
            </Button>

            {!isDeviceInMaintenance && deviceSelectionSize === 1 && (
              <div className="mdk-miner-controls__single-device-stack">
                <Button
                  disabled={isLoading}
                  onClick={() => setMinerDialogFlow(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE)}
                >
                  Move to Maintenance
                </Button>
                <Button
                  disabled={isLoading}
                  onClick={() => setMinerDialogFlow(POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO)}
                >
                  Change miner info
                </Button>
                <Button
                  disabled={isLoading}
                  onClick={() =>
                    setMinerDialogFlow(POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION)
                  }
                >
                  Change position
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ContainerSelectionDialog
        miner={headDevice}
        open={isContainerSelectionFlow}
        isLoading={isLoading}
        onClose={() => setIsContainerSelectionFlow(false)}
      />
      <RemoveMinerDialog
        headDevice={headDevice}
        isRemoveMinerFlow={isRemoveMinerFlow}
        onCancel={() => setIsRemoveMinerFlow(false)}
      />
      <AddReplaceMinerDialog
        open={isChangeInfoDialogOpen}
        onClose={() => setIsChangeInfoDialogOpen(false)}
        selectedEditSocket={{ miner: headDevice }}
        currentDialogFlow={POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO}
      />
      <PositionChangeDialog
        open={!!minerDialogFlow}
        dialogFlow={minerDialogFlow as string}
        onClose={() => setMinerDialogFlow(null)}
        selectedSocketToReplace={
          minerDialogFlow === POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION
            ? { miner: headDevice, containerInfo: headDevice?.info }
            : undefined
        }
        selectedEditSocket={
          minerDialogFlow !== POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION
            ? { miner: headDevice, containerInfo: headDevice?.info }
            : undefined
        }
      />
    </div>
  )
}
