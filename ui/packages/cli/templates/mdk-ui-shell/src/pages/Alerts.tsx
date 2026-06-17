import { useCurrentAlertDevices, useDevices, useHistoricalAlerts } from '@tetherto/mdk-react-adapter'
import { Alerts as AlertsFeature } from '@tetherto/mdk-react-devkit'
import type { Alert, Device } from '@tetherto/mdk-react-devkit'
import { getDefaultHistoricalAlertsRange } from '@tetherto/mdk-ui-core'
import type { HistoricalAlertsRange } from '@tetherto/mdk-ui-core'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

/**
 * Alerts page — live current alerts (polled from `list-things`) plus the
 * historical alerts log (chunked `history-log` fetch). Thin glue: the two
 * adapter hooks own all fetching/shaping; this file only wires their output
 * into the devkit `<Alerts>` feature and handles routing.
 *
 * `onAlertClick` shallow-updates the URL to `/alerts/{uuid}` (v1) — there is no
 * device explorer to cross-navigate to yet. The header bell deep-links here
 * with `?severity=` to pre-filter the current-alerts table.
 */
const AlertsPage = () => {
  const navigate = useNavigate()
  const { uuid: selectedAlertId } = useParams()
  const [searchParams] = useSearchParams()
  const initialSeverity = searchParams.get('severity') ?? undefined

  const [range, setRange] = useState<HistoricalAlertsRange>(getDefaultHistoricalAlertsRange)

  // Search chips live in the shared devices store (the devkit <Alerts> feature
  // writes them); passing them here narrows the list-things fetch server-side.
  const { filterTags } = useDevices()
  const devices = useCurrentAlertDevices({ filterTags })
  const historical = useHistoricalAlerts(range)

  return (
    <div className="mdk-ui-shell-alerts">
      <h1 className="mdk-ui-shell-alerts__title">Alerts</h1>

      <AlertsFeature
        devices={devices.data as Device[][] | undefined}
        isCurrentAlertsLoading={devices.isLoading}
        historicalAlerts={historical.data as Alert[] | undefined}
        isHistoricalAlertsLoading={historical.isLoading}
        isHistoricalAlertsEnabled
        initialSeverity={initialSeverity}
        selectedAlertId={selectedAlertId}
        onAlertClick={(_id, uuid) => {
          if (uuid) void navigate(`/alerts/${uuid}`, { replace: true })
        }}
        dateRange={range}
        onDateRangeChange={setRange}
      />
    </div>
  )
}

export default AlertsPage
