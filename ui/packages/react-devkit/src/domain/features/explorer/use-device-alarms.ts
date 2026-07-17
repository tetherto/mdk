import { useMemo } from "react"

import { useTimezoneFormatter } from "@tetherto/mdk-react-adapter"

import type { TimelineItemData } from "../../components/alarm/alarm-row/alarm-row"
import type { Alert, LogFormattedAlertData } from "../../types/alerts"
import type { Device } from "../../types/device"
import {
  getAlarms,
  getAlertTimelineItems,
  getLogFormattedAlertData,
} from "../../utils/alerts-utils"
import { getDeviceData } from "../../utils/device-utils"

export type UseDeviceAlarmsResult = {
  /** Timeline items ready for the detail panel's "Active Alarms" box. */
  alarmsDataItems: TimelineItemData[]
  /** Total number of alarms across the selected devices. */
  alarmsCount: number
}

/**
 * Shapes the active alarms of the selected devices into timeline items for the
 * Explorer detail panel, mirroring MOS's `getContainerFormatedAlerts` →
 * `getAlertTimelineItems` chain: `getAlarms` reads each device's
 * `last.alerts`, `getLogFormattedAlertData` formats each with the device's
 * `id`/`info`/`type` and the timezone-aware date formatter, and
 * `getAlertTimelineItems` wires the log/dot rows plus the `onNavigate`
 * click-through to the alert detail route.
 *
 * @category cards
 * @domain device-management
 * @tier advanced
 */
export const useDeviceAlarms = (
  devices: Device[] = [],
  onNavigate: (path: string) => void = () => {},
): UseDeviceAlarmsResult => {
  const { getFormattedDate } = useTimezoneFormatter()

  return useMemo(() => {
    const formattedAlerts = devices.reduce<LogFormattedAlertData[]>((acc, device) => {
      const alarms = getAlarms(device)

      if (!Array.isArray(alarms) || alarms.length === 0) {
        return acc
      }

      const [, deviceData] = getDeviceData(device)

      alarms.forEach((alert) => {
        acc.push(
          getLogFormattedAlertData(
            {
              alert: alert as Alert,
              id: deviceData?.id ?? device.id,
              info: deviceData?.info ?? device.info,
              type: (deviceData?.type ?? device.type) as string,
            },
            getFormattedDate,
          ),
        )
      })

      return acc
    }, [])

    // `getLogFormattedAlertData` leaves `uuid` optional (alerts may lack one);
    // the timeline items require a string uuid for the click-through key.
    const logs = formattedAlerts.map((alert) => ({ ...alert, uuid: alert.uuid ?? "" }))

    return {
      alarmsDataItems: getAlertTimelineItems(logs, onNavigate),
      alarmsCount: logs.length,
    }
  }, [devices, onNavigate, getFormattedDate])
}
