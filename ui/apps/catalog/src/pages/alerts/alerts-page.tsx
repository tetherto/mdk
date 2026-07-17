import { useMemo, useState } from 'react'
import type { JSX } from 'react'

import { Button, Checkbox, Typography } from '@tetherto/mdk-react-devkit/primitives'
import { Alerts } from '@tetherto/mdk-react-devkit/domain'

import { DemoPageHeader } from '../../components/demo-page-header'

import { DEMO_DEVICES_PAYLOAD, DEMO_HISTORICAL_ALERTS } from './alerts-page.fixtures'

import './alerts-page.scss'

/**
 * Alerts demo. In production, replace `DEMO_DEVICES_PAYLOAD` with the
 * output of `useActiveIncidents()` from `@tetherto/mdk-react-adapter`
 * — see ./alerts-page.fixtures.ts for the fixture-vs-hook split.
 */
export const AlertsPageDemo = (): JSX.Element => {
  const [historicalEnabled, setHistoricalEnabled] = useState(true)
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(undefined)
  const [soundTestEnabled, setSoundTestEnabled] = useState(false)

  const header = useMemo(
    () => (
      <div className="alerts-demo-toolbar">
        <label className="alerts-demo-toolbar__toggle">
          <Checkbox
            checked={historicalEnabled}
            onCheckedChange={(checked) => setHistoricalEnabled(checked === true)}
          />
          <Typography variant="body">Historical alerts log</Typography>
        </label>
        <label className="alerts-demo-toolbar__toggle">
          <Checkbox
            checked={soundTestEnabled}
            onCheckedChange={(checked) => setSoundTestEnabled(checked === true)}
          />
          <Typography variant="body">Enable alert sound (test)</Typography>
        </label>
        {selectedAlertId ? (
          <Button variant="secondary" size="sm" onClick={() => setSelectedAlertId(undefined)}>
            Clear selected alert ({selectedAlertId})
          </Button>
        ) : null}
      </div>
    ),
    [historicalEnabled, selectedAlertId, soundTestEnabled],
  )

  return (
    <div className="alerts-demo-page">
      <DemoPageHeader
        title="Alerts"
        description="Use the sound toggle in the toolbar to test the synthesized alarm on this page."
      />
      <Alerts
        header={header}
        devices={DEMO_DEVICES_PAYLOAD}
        historicalAlerts={DEMO_HISTORICAL_ALERTS}
        isHistoricalAlertsEnabled={historicalEnabled}
        selectedAlertId={selectedAlertId}
        isSoundEnabled={soundTestEnabled}
        isDemoMode={!soundTestEnabled}
        onAlertClick={(_id, uuid) => setSelectedAlertId(uuid)}
      />
    </div>
  )
}
