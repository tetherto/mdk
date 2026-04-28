import type { IndicatorColor } from '@tetherto/core'
import type { DeviceStatus } from '../../../../constants/devices'
import { DEVICE_STATUS } from '../../../../constants/devices'

/**
 * Resolve oil pump row status from fault and running flags (Bitmain immersion summary).
 */
export const getPumpStatus = (pumpFault?: boolean, isPumpRunning?: boolean): DeviceStatus => {
  if (pumpFault) {
    return DEVICE_STATUS.ERROR
  }
  if (isPumpRunning) {
    return DEVICE_STATUS.RUNNING
  }
  return DEVICE_STATUS.OFF
}

/**
 * Map {@link DeviceStatus} pump label to {@link IndicatorColor} for summary indicators.
 */
export const pumpStatusToIndicatorColor = (status: DeviceStatus): IndicatorColor => {
  if (status === DEVICE_STATUS.ERROR) {
    return 'red'
  }
  if (status === DEVICE_STATUS.RUNNING) {
    return 'green'
  }
  return 'gray'
}
