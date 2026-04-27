import { MINER_TYPE } from '../constants/device-constants'
import type { Device } from '../types'
import { isAntminerContainer, isAvalonContainer, isWhatsminerContainer } from './container-utils'
import { isAntminer, isAvalon, isWhatsminer } from './device-utils'

type DeviceChecker = (type: string) => boolean

const DEVICE_MODEL_MAP: {
  model: string
  checks: DeviceChecker[]
}[] = [
  {
    model: MINER_TYPE.AVALON,
    checks: [isAvalon, isAvalonContainer],
  },
  {
    model: MINER_TYPE.WHATSMINER,
    checks: [isWhatsminer, isWhatsminerContainer],
  },
  {
    model: MINER_TYPE.ANTMINER,
    checks: [isAntminer, isAntminerContainer],
  },
]

export const getDeviceModel = (device?: Device): string => {
  const deviceType = device?.type

  if (!deviceType) return 'other'

  for (const { model, checks } of DEVICE_MODEL_MAP) {
    if (checks.some((check) => check(deviceType))) {
      return model
    }
  }

  return 'other'
}
