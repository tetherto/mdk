import { zodResolver } from '@hookform/resolvers/zod'
import _map from 'lodash/map'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch } from 'react-redux'
import { z } from 'zod'

import type { UnknownRecord } from '@tetherto/core'
import { Button, createFieldNames, DialogFooter, Form, FormCheckbox } from '@tetherto/core'

import { ACTION_TYPES, BATCH_ACTION_TYPES } from '../../../../../../constants/actions'
import { MAINTENANCE_CONTAINER } from '../../../../../../constants/container-constants'
import { MINER_LOCATIONS } from '../../../../../../constants/miner-constants'
import { useMinerDuplicateValidation } from '../../../../../../hooks/use-miner-duplicate-validation'
import type { SelectedEditSocket } from '../../../../../../hooks/use-static-miner-ip-assignment'
import { useStaticMinerIpAssignment } from '../../../../../../hooks/use-static-miner-ip-assignment'
import { actionsSlice } from '../../../../../../state'
import type { Device } from '../../../../../../types'
import { getDevicesIdList } from '../../../../../../utils/action-utils'
import { getDeviceContainerPosText } from '../../../../../../utils/container-utils'
import { notifyInfo } from '../../../../../../utils/notification-utils'
import { getPosHistory } from '../position-change-dialog-utils'
import { RackIdSelectionDropdown } from '../rack-id-selection-dropdown/rack-id-selection-dropdown'
import { StaticMinerIpAssigment } from '../static-miner-ip-assigment/static-miner-ip-assigment'
import './confirm-change-position-dialog-content.scss'

const { setAddPendingSubmissionAction } = actionsSlice.actions

/**
 * MOCKED DATA - To be replaced by useGetListThingsQuery
 */
const MOCK_SPARE_PARTS = [
  { id: 'part-001', rack: 'rack-alpha', info: { location: 'maintenance' } },
  { id: 'part-002', rack: 'rack-beta', info: { location: 'maintenance' } },
]

const confirmPositionSchema = z
  .object({
    containerMinerRackId: z.string().min(1, 'Rack ID is required'),
    forceSetIp: z.boolean().default(false),
    minerIp: z.string().optional(),
  })
  .refine((data) => !data.forceSetIp || (data.minerIp && data.minerIp.length > 0), {
    message: 'IP address is required when force set IP is enabled',
    path: ['minerIp'],
  })

type ConfirmPositionFormValues = z.infer<typeof confirmPositionSchema>
const field = createFieldNames<ConfirmPositionFormValues>()

type ConfirmChangePositionDialogContentProps = {
  selectedSocketToReplace?: UnknownRecord
  selectedEditSocket?: UnknownRecord
  isContainerEmpty: boolean
  onSave: VoidFunction
  onCancel: VoidFunction
}

export const ConfirmChangePositionDialogContent = ({
  selectedSocketToReplace,
  selectedEditSocket,
  isContainerEmpty,
  onSave,
  onCancel,
}: ConfirmChangePositionDialogContentProps) => {
  const dispatch = useDispatch()

  // Custom Hooks (Mocks handled inside hooks)
  const { isStaticIpAssignment, minerIp: autoIp } = useStaticMinerIpAssignment(
    selectedEditSocket as SelectedEditSocket,
  )
  const { checkDuplicate, duplicateError, isDuplicateCheckLoading, setDuplicateError } =
    useMinerDuplicateValidation()

  const isBackFromMaintenance =
    (selectedSocketToReplace?.containerInfo as UnknownRecord)?.container === MAINTENANCE_CONTAINER

  const form = useForm<ConfirmPositionFormValues>({
    resolver: zodResolver(confirmPositionSchema),
    defaultValues: {
      containerMinerRackId:
        ((selectedSocketToReplace?.miner as UnknownRecord)?.rack as string) || '',
      forceSetIp: isBackFromMaintenance,
      minerIp: autoIp || '',
    },
  })

  const forceSetIp = form.watch('forceSetIp')
  const minerIpValue = form.watch('minerIp')

  const confirmationText = React.useMemo(() => {
    if (isBackFromMaintenance) {
      return `Are you sure to bring miner back from maintenance to ${getDeviceContainerPosText(selectedEditSocket!)} ?`
    }
    const code = (selectedSocketToReplace?.miner as Device)?.code || ''
    const initialInfo = getDeviceContainerPosText({
      containerInfo: selectedSocketToReplace?.containerInfo as UnknownRecord,
      pos: (selectedSocketToReplace?.miner as Device).info?.pos,
    })
    const destinationInfo = getDeviceContainerPosText(selectedEditSocket!)
    return `Are you sure to change position of miner ${code} from ${initialInfo} to ${destinationInfo} ?`
  }, [isBackFromMaintenance, selectedEditSocket, selectedSocketToReplace])

  const onSubmit = async (values: ConfirmPositionFormValues) => {
    if (values.minerIp && isStaticIpAssignment && values.forceSetIp) {
      const isDuplicate = await checkDuplicate(selectedEditSocket || null, {
        address: values.minerIp,
      })
      if (isDuplicate) return
    }

    const selectedSocketMiner = selectedSocketToReplace?.miner as UnknownRecord | undefined
    const selectedEditSocketContainerInfo = selectedEditSocket?.containerInfo as
      | UnknownRecord
      | undefined

    // Using Mocked Spare Parts Logic
    const sparePartActions = isBackFromMaintenance
      ? _map(MOCK_SPARE_PARTS, (part) => {
          const action = {
            action: ACTION_TYPES.UPDATE_THING,
            minerId: part.id as string,
            params: [
              {
                id: part.id,
                rackId: part.rack,
                info: { location: MINER_LOCATIONS.SITE_CONTAINER },
              },
            ],
            tags: [] as string[],
          }
          action.tags = getDevicesIdList(action as UnknownRecord) || []
          return action
        })
      : []

    const minerAction = {
      action: ACTION_TYPES.UPDATE_THING,
      minerId: selectedSocketMiner?.id as string,
      params: [
        {
          rackId: selectedSocketMiner?.rack,
          id: selectedSocketMiner?.id,
          code: selectedSocketMiner?.code,
          info: {
            container: selectedEditSocketContainerInfo?.container,
            pos: `${selectedEditSocket?.pdu}_${selectedEditSocket?.socket}`,
            subnet: selectedEditSocketContainerInfo?.subnet,
            posHistory: getPosHistory(selectedSocketToReplace!),
            ...(isBackFromMaintenance ? { location: MINER_LOCATIONS.SITE_CONTAINER } : {}),
          },
          opts: {
            forceSetIp: values.forceSetIp,
            address: isStaticIpAssignment && values.forceSetIp ? values.minerIp : undefined,
          },
        },
      ],
    }

    const batchedAction = {
      action: BATCH_ACTION_TYPES.MOVE_BACK_FROM_MAINTENANCE_TO_CONTAINER,
      batchActionUID: selectedSocketMiner?.id as string,
      batchActionsPayload: [minerAction, ...sparePartActions],
      metadata: { isBackFromMaintenance },
    }

    dispatch(setAddPendingSubmissionAction(batchedAction))
    onSave()
    notifyInfo(
      'Action added',
      isBackFromMaintenance
        ? `Bring miner back from maintenance to ${getDeviceContainerPosText(selectedEditSocket!)}`
        : `Change Position from ${getDeviceContainerPosText(selectedSocketToReplace!)} to ${getDeviceContainerPosText(selectedEditSocket!)}`,
    )
  }

  return (
    <div className="mdk-confirm-position">
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <p className="mdk-confirm-position__text">{confirmationText}</p>

        <div className="mdk-confirm-position__fields">
          {isContainerEmpty && (!selectedEditSocket?.miner as unknown as Device)?.rack && (
            <div className="mdk-confirm-position__field-group">
              <label className="mdk-confirm-position__label">Rack Id</label>
              <RackIdSelectionDropdown
                value={form.watch('containerMinerRackId')}
                handleChange={(val) => form.setValue('containerMinerRackId', val as string)}
              />
            </div>
          )}

          <StaticMinerIpAssigment
            forceSetIp={forceSetIp}
            isStaticIpAssignment={isStaticIpAssignment || isBackFromMaintenance}
            minerIp={minerIpValue || ''}
            setMinerIp={(ip) => form.setValue('minerIp', ip as string)}
            isChangeInfo={false}
          />

          {!isBackFromMaintenance && (
            <FormCheckbox
              control={form.control}
              name={field('forceSetIp')}
              label="Force set new IP"
              checkboxProps={{
                onCheckedChange: () => setDuplicateError(false),
              }}
            />
          )}
        </div>

        {duplicateError && (
          <div className="mdk-confirm-position__error">IP address is already being used.</div>
        )}

        <DialogFooter className="mdk-confirm-position__footer">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isDuplicateCheckLoading || form.formState.isSubmitting}
          >
            {isBackFromMaintenance ? 'Back from maintenance' : 'Change position'}
          </Button>
        </DialogFooter>
      </Form>
    </div>
  )
}
