import { ActionButton, Button, formatNumber, UNITS, unitToKilo } from '@tetherto/mdk-core-ui'
import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../constants/actions'
import type { SocketData } from '../../../../../state'
import { actionsSlice, selectSelectedSockets } from '../../../../../state'
import {
  getNumberSelected,
  isContainerControlNotSupported,
} from '../../../../../utils/container-utils'
import { appendContainerToTag, getOnOffText } from '../../../../../utils/device-utils'
import { notifyInfo } from '../../../../../utils/notification-utils'
import { SecondaryStatCard } from '../secondary-stat-card/secondary-stat-card'
import './container-controls-card.scss'

const { setAddPendingSubmissionAction } = actionsSlice.actions

type ButtonsStates = {
  isMinerControlButtonDisabled?: boolean
  isCoolingControlButtonDisabled?: boolean
  isSwitchSocketButtonDisabled?: boolean
}

type ContainerControlsCardProps = {
  isLoading: boolean
  buttonsStates: ButtonsStates
}

export const ContainerControlsCard = ({
  isLoading,
  buttonsStates = {},
}: Partial<ContainerControlsCardProps>) => {
  const dispatch = useDispatch()
  const selectedSockets = useSelector(selectSelectedSockets) as Record<
    string,
    { sockets: SocketData[] }
  >

  const { nSockets } = getNumberSelected(selectedSockets)

  const stats = useMemo(() => {
    const totals = { power: 0, current: 0 }
    Object.values(selectedSockets).forEach((container) => {
      container?.sockets?.forEach((socket) => {
        totals.power += (socket?.power_w as number) ?? 0
        totals.current += (socket?.current_a as number) ?? 0
      })
    })
    return totals
  }, [selectedSockets])

  const isUnsupported = useMemo(
    () =>
      Object.keys(selectedSockets).some((container) => isContainerControlNotSupported(container)),
    [selectedSockets],
  )

  const switchSocket = (isOn: boolean) => {
    Object.entries(selectedSockets).forEach(([containerName, containerData]) => {
      const socketRows = (containerData?.sockets || []).map((socket) => {
        const isChanged = socket.enabled !== isOn
        return [socket.pduIndex, socket.socketIndex, isOn, isChanged]
      })

      const hasChanges = socketRows.some(([, , , isChanged]) => isChanged)
      const payload = socketRows.map((s) => s.slice(0, 3))

      if (!hasChanges) {
        notifyInfo('No actions added', 'No sockets affected by the action')
      } else {
        dispatch(
          setAddPendingSubmissionAction({
            type: SUBMIT_ACTION_TYPES.VOTING,
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: [appendContainerToTag(containerName)],
            params: [payload],
          }),
        )

        const count = socketRows.length
        const socketLabel = count === 1 ? 'Socket' : 'Sockets'

        notifyInfo('Action added', `Switch ${count} ${socketLabel} ${getOnOffText(isOn)}`)
      }
    })
  }

  if (nSockets <= 0 || isUnsupported) return null

  return (
    <div className="mdk-miner-info-card">
      <div className="mdk-miner-info-card__label">Container Controls</div>

      <div className="mdk-miner-info-card__row">
        <div className="mdk-miner-info-card__controls">
          <SecondaryStatCard name={`Power (${UNITS.POWER_KW})`} value={unitToKilo(stats.power)} />
          <SecondaryStatCard
            name={`Current (${UNITS.AMPERE})`}
            value={formatNumber(stats.current)}
          />
          <ActionButton
            confirmation={{
              title: 'Power on sockets',
              description: 'Ensure cooling system is ON before turning ON sockets/miners',
              onConfirm: () => switchSocket(true),
            }}
            disabled={buttonsStates.isSwitchSocketButtonDisabled || isLoading}
            label="Power on"
          />
          <Button
            type="button"
            className="mdk-miner-info-card__button"
            disabled={buttonsStates.isSwitchSocketButtonDisabled || isLoading}
            onClick={() => switchSocket(false)}
          >
            Power off
          </Button>
        </div>
      </div>
    </div>
  )
}
