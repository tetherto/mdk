import { Input } from '@tetherto/mdk-core-ui'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'

type StaticMinerIpAssigmentProps = {
  setMinerIp: Dispatch<SetStateAction<string>>
  isStaticIpAssignment?: boolean
  minerIp: string
  forceSetIp: boolean
  isChangeInfo: boolean
}

export const StaticMinerIpAssigment = ({
  setMinerIp,
  isStaticIpAssignment,
  minerIp,
  forceSetIp,
  isChangeInfo,
}: StaticMinerIpAssigmentProps) => {
  const onIpInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMinerIp(e.target.value)
  }
  const shouldShow = isStaticIpAssignment && (!isChangeInfo || forceSetIp)

  if (!shouldShow) return null

  return (
    <Input
      label="Changed Miner IP Address"
      id="miner-ip-input"
      value={minerIp}
      onChange={onIpInputChange}
      disabled={!forceSetIp}
      placeholder="e.g. 10.x.x.x"
      wrapperClassName="mdk-static-ip-assignment"
    />
  )
}
