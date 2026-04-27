import { zodResolver } from '@hookform/resolvers/zod'
import type { UnknownRecord } from '@mdk/core'
import {
  Button,
  createFieldNames,
  Form,
  formatMacAddress,
  FormCheckbox,
  FormInput,
  FormTagInput,
  validators,
} from '@mdk/core'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { z } from 'zod'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../constants/actions'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../constants/dialog'
import { useNotification } from '../../../../../hooks'
import { useMinerDuplicateValidation } from '../../../../../hooks/use-miner-duplicate-validation'
import type { SelectedEditSocket } from '../../../../../hooks/use-static-miner-ip-assignment'
import { useStaticMinerIpAssignment } from '../../../../../hooks/use-static-miner-ip-assignment'
import { actionsSlice } from '../../../../../state'
import type { ContainerPosInfo, Device } from '../../../../../types'
import { getDeviceContainerPosText } from '../../../../../utils/container-utils'
import { RackIdSelectionDropdown } from '../position-change-dialog/rack-id-selection-dropdown/rack-id-selection-dropdown'
import { StaticMinerIpAssigment } from '../position-change-dialog/static-miner-ip-assigment/static-miner-ip-assigment'
import './add-replace-miner-dialog-content.scss'
import { buildAddReplaceMinerParams, isActionExists } from './helper'

const { setAddPendingSubmissionAction } = actionsSlice.actions

const MOCK_SHORT_CODES = [
  { rackId: 'rack-001', requestValue: 'M-SNOW-01' },
  { rackId: 'rack-002', requestValue: 'M-ICE-02' },
]

const getValidationSchema = (isChangeInfo: boolean, isDirectToMaintenanceMode: boolean) =>
  z.object({
    serialNumber: validators
      .requiredString({ minLength: 1 })
      .transform((v) => v.replace(/\s+/g, '')),
    macAddress: validators
      .requiredString({ minLength: 12 })
      .transform((v) => v.toLowerCase().replace(/\s+/g, '')),
    username: isChangeInfo ? z.string().optional() : z.string().min(1, 'Username is required'),
    password: isChangeInfo ? z.string().optional() : z.string().min(1, 'Password is required'),
    shortCode: z.string().min(1, 'Short code is required'),
    tags: z.array(z.string()).default([]),
    forceSetIp: z.boolean().default(false),
    containerMinerRackId:
      isDirectToMaintenanceMode || !isChangeInfo
        ? z.string().min(1, 'Miner type is required')
        : z.string().optional(),
    minerIp: z.string().optional(),
  })

type MinerFormValues = z.infer<ReturnType<typeof getValidationSchema>>
const field = createFieldNames<MinerFormValues>()

type AddReplaceMinerDialogContentProps = {
  selectedEditSocket: UnknownRecord
  onCancel: VoidFunction
  currentDialogFlow: string
  isDirectToMaintenanceMode: boolean
  minersType: string
}

export const AddReplaceMinerDialogContent = ({
  selectedEditSocket,
  onCancel,
  currentDialogFlow,
  isDirectToMaintenanceMode = false,
  minersType,
}: Partial<AddReplaceMinerDialogContentProps>) => {
  const dispatch = useDispatch()
  const { notifyInfo, notifyError } = useNotification()
  const pendingSubmissions = useSelector(actionsSlice.selectors.selectPendingSubmissions)

  const isChangeInfo = currentDialogFlow === POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO
  const { isStaticIpAssignment, minerIp: autoIp } = useStaticMinerIpAssignment(
    selectedEditSocket as SelectedEditSocket,
  )
  const { checkDuplicate, duplicateError, isDuplicateCheckLoading, setDuplicateError } =
    useMinerDuplicateValidation()

  const selectedMiner = selectedEditSocket?.miner as Device | undefined
  const selectedMinerInfo = selectedMiner?.info as Record<string, unknown> | undefined
  const selectedContainerInfo = selectedEditSocket?.containerInfo as UnknownRecord | undefined

  const form = useForm<MinerFormValues>({
    resolver: zodResolver(getValidationSchema(isChangeInfo, isDirectToMaintenanceMode)),
    defaultValues: {
      serialNumber: (selectedMinerInfo?.serialNum as string) || '',
      macAddress: (selectedMinerInfo?.macAddress as string) || '',
      username: '',
      password: '',
      shortCode: selectedMiner?.code || '',
      tags: (selectedMiner?.tags as string[]) || [],
      forceSetIp: false,
      containerMinerRackId:
        (selectedContainerInfo?.rack as string) ||
        (selectedMiner?.rack as string) ||
        minersType ||
        '',
      minerIp: autoIp || '',
    },
  })

  const forceSetIp = form.watch('forceSetIp')
  const minerIpValue = form.watch('minerIp')
  const rackId = form.watch('containerMinerRackId')

  React.useEffect(() => {
    if (isChangeInfo || !rackId) return
    const nextCode = MOCK_SHORT_CODES.find((c) => c.rackId === rackId)?.requestValue
    if (nextCode) {
      form.setValue('shortCode', nextCode)
    }
  }, [rackId, isChangeInfo, form])

  const getNotificationText = (values: MinerFormValues): string => {
    const containerPosText = getDeviceContainerPosText(selectedEditSocket as ContainerPosInfo)
    const commonText = `Code: ${values.shortCode}, SN: ${values.serialNumber}, MAC: ${formatMacAddress(values.macAddress)}${containerPosText ? ` to ${containerPosText}` : ''}`

    switch (currentDialogFlow) {
      case POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO:
        return `Change Miner Info: SN: ${values.serialNumber}, MAC: ${formatMacAddress(values.macAddress)}`
      case POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER:
        return `Replace Miner: ${selectedMiner?.id} with Miner: ${commonText}`
      default:
        return `Add Miner: ${commonText}`
    }
  }

  const getButtonText = (): string => {
    switch (currentDialogFlow) {
      case POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO:
        return 'Change Miner Info'
      case POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER:
        return 'Replace Miner'
      default:
        return 'Add Miner'
    }
  }

  const onSubmit = async (values: MinerFormValues) => {
    setDuplicateError(false)

    const duplicatePayload = isChangeInfo
      ? {
          ...(values.macAddress !== (selectedMinerInfo?.macAddress as string)
            ? { macAddress: values.macAddress }
            : {}),
          ...(values.serialNumber !== (selectedMinerInfo?.serialNumber as string)
            ? { serialNumber: values.serialNumber }
            : {}),
          ...(values.shortCode !== (selectedMiner?.code as string)
            ? { code: values.shortCode }
            : {}),
        }
      : {
          macAddress: values.macAddress,
          serialNumber: values.serialNumber,
          address: values.minerIp,
          code: values.shortCode,
        }

    const isDuplicate = await checkDuplicate(
      selectedMiner ? { miner: { id: selectedMiner.id } } : null,
      duplicatePayload,
    )
    if (isDuplicate) return

    if (
      isActionExists({
        pendingSubmissions: pendingSubmissions as unknown[],
        macAddress: values.macAddress,
        serialNumber: values.serialNumber,
      })
    ) {
      notifyError(
        'Action already exists',
        'There is already an action for this serial number or MAC address',
      )
      return
    }

    const params = buildAddReplaceMinerParams({
      containerMinerRackId: isDirectToMaintenanceMode
        ? (rackId as string)
        : values.containerMinerRackId,
      forceSetIp: values.forceSetIp,
      isChangeInfo,
      isDirectToMaintenanceMode,
      macAddress: values.macAddress,
      password: values.password,
      selectedEditSocket,
      serialNumber: values.serialNumber,
      shortCode: values.shortCode,
      tags: values.tags,
      username: values.username,
      isStaticIpAssignment,
      minerIp: values.minerIp,
    })

    dispatch(
      setAddPendingSubmissionAction({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: isChangeInfo ? ACTION_TYPES.UPDATE_THING : ACTION_TYPES.REGISTER_THING,
        params,
        minerId: selectedMiner?.id,
      }),
    )

    notifyInfo('Action added', getNotificationText(values))
    form.reset()
    onCancel?.()
  }

  return (
    <div className="mdk-add-replace-miner">
      <Form
        form={form}
        onSubmit={(e) => {
          e.stopPropagation()
          form.handleSubmit(onSubmit)(e)
        }}
      >
        <div className="mdk-add-replace-miner__grid">
          {!currentDialogFlow && (
            <div className="mdk-add-replace-miner__field-group">
              <label className="mdk-add-replace-miner__label">Miner Type</label>
              <RackIdSelectionDropdown
                value={rackId}
                handleChange={(val) => {
                  form.setValue('containerMinerRackId', val)
                  form.clearErrors('containerMinerRackId')
                }}
                status={form.formState.errors.containerMinerRackId ? 'error' : undefined}
              />
              {form.formState.errors.containerMinerRackId && (
                <span className="mdk-add-replace-miner__error-msg">
                  {form.formState.errors.containerMinerRackId.message}
                </span>
              )}
            </div>
          )}

          <FormInput
            control={form.control}
            name={field('shortCode')}
            label="Short Code"
            placeholder="M-XXXX"
            disabled={!!currentDialogFlow}
          />

          <FormInput
            control={form.control}
            name={field('serialNumber')}
            label="Serial Number"
            placeholder="Enter serial number"
          />

          <FormInput
            control={form.control}
            name={field('macAddress')}
            label="MAC Address"
            placeholder="00:00:00:00:00:00"
          />

          {!isChangeInfo && (
            <div className="mdk-add-replace-miner__auth-section">
              <FormInput control={form.control} name={field('username')} label="Username" />
              <FormInput
                control={form.control}
                name={field('password')}
                label="Password"
                type="password"
              />
            </div>
          )}

          <FormTagInput
            control={form.control}
            name={field('tags')}
            label="Tags"
            placeholder="Select or add tags"
            options={['Production', 'Immersion', 'Air-Cooled', 'Repair']}
          />

          {!isDirectToMaintenanceMode && isStaticIpAssignment && (!isChangeInfo || forceSetIp) && (
            <StaticMinerIpAssigment
              forceSetIp={forceSetIp}
              isStaticIpAssignment={isStaticIpAssignment}
              minerIp={minerIpValue || ''}
              setMinerIp={(val) => form.setValue('minerIp', val.toString())}
              isChangeInfo={isChangeInfo}
            />
          )}

          {isStaticIpAssignment ||
            (!isDirectToMaintenanceMode && !isChangeInfo && (
              <FormCheckbox
                control={form.control}
                name={field('forceSetIp')}
                label="Force set new IP"
              />
            ))}
        </div>

        {duplicateError && (
          <div className="mdk-add-replace-miner__error-msg mdk-add-replace-miner--duplicate">
            {`Short code, Serial Number${isStaticIpAssignment && forceSetIp ? ', IP address' : ''} or MAC address is already being used`}
          </div>
        )}

        <div className="mdk-add-replace-miner__footer">
          <Button
            type="submit"
            variant="primary"
            disabled={form.formState.isSubmitting || isDuplicateCheckLoading}
          >
            {getButtonText()}
          </Button>
        </div>
      </Form>
    </div>
  )
}
