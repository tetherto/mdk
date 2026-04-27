import type { FC } from 'react'
import { useEffect, useState } from 'react'

import type { UnknownRecord } from '@mdk/core'
import { ActionButton, Button, Label, SimpleTooltip, Switch } from '@mdk/core'

import { MinerPowerModeSelectionButtons } from '../../explorer/details-view/miner-power-mode-selection-buttons/miner-power-mode-selection-buttons'
import { ContentBox } from '../content-box/content-box'
import { EnabledDisableToggle } from '../enabled-disable-toggle/enabled-disable-toggle'

import {
  getAntspaceContainerControlsBoxData,
  getBitdeerContainerControlsBoxData,
  isAntspaceHydro,
  isAntspaceImmersion,
  isBitdeer,
  isMicroBT,
} from '../../../../utils/container-utils'

import { QuestionMarkCircledIcon } from '@radix-ui/react-icons'
import { useDispatch } from 'react-redux'
import type {
  PendingSubmission,
  UpdateExistedActionsParams,
} from '../../../../hooks/use-update-existed-actions'
import { useUpdateExistedActions } from '../../../../hooks/use-update-existed-actions'
import { actionsSlice, devicesSlice } from '../../../../state'
import type { ContainerStats, Device } from '../../../../types'
import type { PendingSubmissionAction } from '../../../../types/redux'
import { CONTAINER_STATUS } from '../../../../utils/status-utils'
import { AlarmContents } from '../../alarm/alarm-contents/alarm-contents'
import type { TimelineItemData } from '../../alarm/alarm-row/alarm-row'
import { getButtonsStates } from '../../explorer/details-view/details-view-utils'
import { groupTailLogByMinersByType } from '../../explorer/details-view/miner-controls-card/miner-controls-utils'
import { getContainerState } from '../helper'
import { SystemStatusControlBox } from '../system-status-control-box/system-status-control-box'
import {
  resetAlarm,
  setAirExhaustEnabled,
  setPowerMode,
  setTankEnabled,
  switchAllSockets,
  switchContainer,
  switchCoolingSystem,
} from './container-controls-box-helpers'
import './container-controls-box.scss'

type ContainerControlsData = {
  id: string
  pidModeEnabled: boolean
  runningModeEnabled: boolean
  tank1Enabled: boolean
  tank2Enabled: boolean
  exhaustFanEnabled: boolean
  [key: string]: unknown
}

type ButtonsStates = {
  isSwitchContainerButtonDisabled: boolean
  isSwitchCoolingSystemButtonDisabled: boolean
  isResetAlarmButtonDisabled: boolean
  isSetTank1EnabledButtonDisabled: boolean
  isSetTank2EnabledButtonDisabled: boolean
  isSetAirExhaustEnabledButtonDisabled: boolean
  isSwitchSocketButtonDisabled: boolean
}

export type ContainerControlsBoxProps = {
  data?: Device
  isBatch?: boolean
  isCompact?: boolean
  // --- data from outside (no API calls inside) ---
  selectedDevices?: Device[]
  pendingSubmissions?: PendingSubmission[]
  alarmsDataItems?: TimelineItemData[]
  tailLogData?: UnknownRecord[]
  powerModesLog?: UnknownRecord
  onNavigate: (path: string) => void
}

export const ContainerControlsBox: FC<ContainerControlsBoxProps> = ({
  data,
  isBatch = false,
  selectedDevices = [],
  pendingSubmissions = [],
  alarmsDataItems = [],
  tailLogData,
  onNavigate: _onNavigate,
}) => {
  const dispatch = useDispatch()
  const { setResetSelections } = devicesSlice.actions
  const { setAddPendingSubmissionAction } = actionsSlice.actions
  const { updateExistedActions } = useUpdateExistedActions()

  const isOffline = data?.last?.snap?.stats?.status === CONTAINER_STATUS.OFFLINE

  const [containerControlsData, setContainerControlsData] = useState<
    Partial<ContainerControlsData>
  >({})
  const [pidModeValue, setPidModeValue] = useState(containerControlsData?.pidModeEnabled)
  const [runningModeValue, setRunningModeValue] = useState(
    containerControlsData?.runningModeEnabled,
  )
  const [powerModesLog, setPowerModesLog] = useState<UnknownRecord | undefined>()

  const buttonsStates: Partial<ButtonsStates> = getButtonsStates({
    selectedDevices,
    pendingSubmissions,
  })

  const containerState = getContainerState({
    ...data?.last?.snap?.stats,
    type: data?.type,
  } as ContainerStats)

  const onResetSelections = () => dispatch(setResetSelections())
  const onAddPendingSubmission = (params: unknown) =>
    dispatch(setAddPendingSubmissionAction(params as Omit<PendingSubmissionAction, 'id'>))

  const onUpdateExistedActions = ({
    actionType,
    pendingSubmissions,
    selectedDevices,
  }: UpdateExistedActionsParams) => {
    updateExistedActions({
      actionType,
      pendingSubmissions,
      selectedDevices,
    })
  }

  // sync tailLogData → powerModesLog
  useEffect(() => {
    if (
      isBatch &&
      selectedDevices.length > 0 &&
      Array.isArray(tailLogData) &&
      tailLogData.length > 0
    ) {
      const [headData] = tailLogData
      if (headData) {
        setPowerModesLog(
          groupTailLogByMinersByType(selectedDevices, headData as unknown as UnknownRecord[]),
        )
      }
    }
  }, [tailLogData, selectedDevices, isBatch])

  // sync containerControlsData → local state
  useEffect(() => {
    setPidModeValue(containerControlsData?.pidModeEnabled)
    setRunningModeValue(containerControlsData?.runningModeEnabled)
  }, [containerControlsData?.pidModeEnabled, containerControlsData?.runningModeEnabled])

  // sync data → containerControlsData
  useEffect(() => {
    if (data?.type && isBitdeer(data.type)) {
      setContainerControlsData(
        getBitdeerContainerControlsBoxData(data as Device) as ContainerControlsData,
      )
    }
    if (data?.type && isAntspaceHydro(data.type)) {
      setContainerControlsData(
        getAntspaceContainerControlsBoxData(data as Device) as ContainerControlsData,
      )
    }
  }, [data])

  const isBitdeerType = Boolean(data?.type && isBitdeer(data.type))
  const isAntspaceHydroType = Boolean(data?.type && isAntspaceHydro(data.type))
  const isAntspaceImmersionType = Boolean(data?.type && isAntspaceImmersion(data.type))
  const isMicroBTType = Boolean(data?.type && isMicroBT(data.type))

  return (
    <div className="mdk-container-controls-box">
      {isBitdeerType && (
        <div className="mdk-container-controls-box__buttons-row">
          <SimpleTooltip content={isOffline ? 'Container is offline' : undefined}>
            <Button
              size="sm"
              variant="primary"
              disabled={
                isOffline ||
                (!isBatch &&
                  (buttonsStates.isSwitchContainerButtonDisabled || containerState.isStarted))
              }
              onClick={() =>
                switchContainer({
                  isOn: true,
                  isBatch,
                  selectedDevices,
                  pendingSubmissions,
                  data: data as Device,
                  onUpdateExistedActions,
                  onAddPendingSubmission,
                  onResetSelections,
                })
              }
            >
              Start
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content={isOffline ? 'Container is offline' : undefined}>
            <Button
              size="sm"
              variant="danger"
              disabled={
                isOffline ||
                (!isBatch &&
                  (buttonsStates.isSwitchContainerButtonDisabled || !containerState.isStarted))
              }
              onClick={() =>
                switchContainer({
                  isOn: false,
                  isBatch,
                  selectedDevices,
                  pendingSubmissions,
                  data: data as Device,
                  onUpdateExistedActions,
                  onAddPendingSubmission,
                  onResetSelections,
                  shouldResetDevices: true,
                })
              }
            >
              Stop
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content={isOffline ? 'Container is offline' : undefined}>
            <Button
              size="sm"
              disabled={isOffline || (!isBatch && buttonsStates.isResetAlarmButtonDisabled)}
              onClick={() =>
                resetAlarm({
                  isBatch,
                  selectedDevices,
                  pendingSubmissions,
                  data: data as Device,
                  onUpdateExistedActions,
                  onAddPendingSubmission,
                  onResetSelections,
                })
              }
            >
              Reset Alarm
            </Button>
          </SimpleTooltip>
        </div>
      )}

      {(isAntspaceHydroType || isMicroBTType || isAntspaceImmersionType) && (
        <div className="mdk-container-controls-box__buttons-row">
          <Button
            size="sm"
            variant="primary"
            disabled={
              !isBatch &&
              (buttonsStates.isSwitchCoolingSystemButtonDisabled || containerState.isStarted)
            }
            onClick={() =>
              switchCoolingSystem({
                isOn: true,
                isBatch,
                selectedDevices,
                pendingSubmissions,
                data: data as Device,
                onUpdateExistedActions,
                onAddPendingSubmission,
                onResetSelections,
              })
            }
          >
            Start Cooling
          </Button>

          <Button
            size="sm"
            variant="danger"
            disabled={
              !isBatch &&
              (buttonsStates.isSwitchCoolingSystemButtonDisabled || !containerState.isStarted)
            }
            onClick={() =>
              switchCoolingSystem({
                isOn: false,
                isBatch,
                selectedDevices,
                pendingSubmissions,
                data: data as Device,
                onUpdateExistedActions,
                onAddPendingSubmission,
                onResetSelections,
              })
            }
          >
            Stop Cooling
          </Button>
        </div>
      )}

      <div className="mdk-container-controls-box__toggles-row">
        {isBitdeerType && (
          <>
            <EnabledDisableToggle
              isOffline={isOffline}
              isButtonDisabled={Boolean(buttonsStates.isSetTank1EnabledButtonDisabled)}
              value={containerControlsData?.tank1Enabled}
              tankNumber={1}
              onToggle={({ isOn }) =>
                setTankEnabled({
                  tankNumber: 1,
                  isOn,
                  isBatch,
                  selectedDevices,
                  pendingSubmissions,
                  data: data as Device,
                  onUpdateExistedActions,
                  onAddPendingSubmission,
                  onResetSelections,
                })
              }
            />
            <EnabledDisableToggle
              isOffline={isOffline}
              isButtonDisabled={Boolean(buttonsStates.isSetTank2EnabledButtonDisabled)}
              value={containerControlsData?.tank2Enabled}
              tankNumber={2}
              onToggle={({ isOn }) =>
                setTankEnabled({
                  tankNumber: 2,
                  isOn,
                  isBatch,
                  selectedDevices,
                  pendingSubmissions,
                  data: data as Device,
                  onUpdateExistedActions,
                  onAddPendingSubmission,
                  onResetSelections,
                })
              }
            />
            <EnabledDisableToggle
              isOffline={isOffline}
              isButtonDisabled={Boolean(buttonsStates.isSetAirExhaustEnabledButtonDisabled)}
              value={containerControlsData?.exhaustFanEnabled}
              tankNumber={0}
              onToggle={({ isOn }) =>
                setAirExhaustEnabled({
                  isOn,
                  isBatch,
                  selectedDevices,
                  pendingSubmissions,
                  data: data as Device,
                  onUpdateExistedActions,
                  onAddPendingSubmission,
                  onResetSelections,
                })
              }
            />
          </>
        )}

        {isAntspaceImmersionType && <SystemStatusControlBox data={data as Device} />}

        {(isAntspaceHydroType || isAntspaceImmersionType) && !isBatch && (
          <div className="mdk-container-controls-box__toggle">
            <Label htmlFor="pidMode">PID Mode Enabled:</Label>
            <Switch id="pidMode" checked={pidModeValue} disabled />
          </div>
        )}

        {isAntspaceImmersionType && !isBatch && (
          <div className="mdk-container-controls-box__toggle">
            <Label htmlFor="runningMode">Running Mode Enabled:</Label>
            <Switch id="runningMode" checked={runningModeValue} disabled />
          </div>
        )}
      </div>

      <div className="mdk-container-controls-box__bulk-row">
        {(isBitdeerType || isMicroBTType) && (
          <>
            <SimpleTooltip content={isOffline && 'Container is offline'}>
              <ActionButton
                variant="primary"
                confirmation={{
                  title: 'Power All Sockets On',
                  icon: (
                    <QuestionMarkCircledIcon className="mdk-container-controls-box__bulk-row--action-icon" />
                  ),
                  description:
                    'Please ensure cooling system is ON before turning ON sockets and miners',
                  onConfirm: () =>
                    switchAllSockets({
                      isOn: true,
                      isBatch,
                      selectedDevices,
                      pendingSubmissions,
                      data: data as Device,
                      onUpdateExistedActions,
                      onAddPendingSubmission,
                      onResetSelections,
                    }),
                }}
                disabled={
                  isOffline ||
                  (!isBatch &&
                    (buttonsStates.isSwitchSocketButtonDisabled || containerState.isAllSocketsOn))
                }
                label="Power All Sockets On"
              />
            </SimpleTooltip>

            <SimpleTooltip content={isOffline ? 'Container is offline' : undefined}>
              <Button
                size="sm"
                disabled={
                  isOffline ||
                  (!isBatch &&
                    (buttonsStates.isSwitchSocketButtonDisabled || !containerState.isAllSocketsOn))
                }
                onClick={() =>
                  switchAllSockets({
                    isOn: false,
                    isBatch,
                    selectedDevices,
                    pendingSubmissions,
                    data: data as Device,
                    onUpdateExistedActions,
                    onAddPendingSubmission,
                    onResetSelections,
                  })
                }
              >
                Power All Sockets Off
              </Button>
            </SimpleTooltip>
          </>
        )}

        <MinerPowerModeSelectionButtons
          disabled={!isBatch && !containerState.isStarted}
          selectedDevices={selectedDevices}
          setPowerMode={(selectedDevices, powerMode) => {
            setPowerMode({
              powerMode,
              isBatch,
              selectedDevices,
              devices: selectedDevices,
              pendingSubmissions,
              data: data as Device,
              onUpdateExistedActions,
              onAddPendingSubmission,
              onResetSelections,
            })
          }}
          connectedMiners={data?.connectedMiners as Device[]}
          powerModesLog={powerModesLog}
        />
      </div>

      <ContentBox title="Active Alarms">
        <AlarmContents alarmsData={alarmsDataItems} onNavigate={_onNavigate} />
      </ContentBox>
    </div>
  )
}
