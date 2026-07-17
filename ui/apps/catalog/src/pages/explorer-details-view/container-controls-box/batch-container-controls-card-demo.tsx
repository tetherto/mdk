import { devicesStore } from '@tetherto/mdk-ui-foundation'
import { type ReactElement, useEffect, useMemo, useState } from 'react'

import { DemoPageHeader } from '../../../components/demo-page-header'
import { BatchContainerControlsCard } from '@tetherto/mdk-react-devkit/domain'

import {
  SCENARIOS,
  type SelectedContainersMap,
} from './batch-container-controls-card-demo.fixtures'

import './batch-container-controls-card-demo.scss'

/**
 * BatchContainerControlsCard demo. The card reads its selection from
 * `devicesStore.selectedContainers` (shared Zustand singleton), so the
 * page seeds the store from a chosen scenario.
 *
 * In production, replace the scenario fixtures with a real device
 * fetch — see ./batch-container-controls-card-demo.fixtures.ts.
 */

const seedSelectedContainers = (selectedContainers: SelectedContainersMap) => {
  const api = devicesStore.getState()
  api.setResetSelections()
  Object.values(selectedContainers).forEach((container) => {
    api.selectContainer(container as never)
  })
}

export const BatchContainerControlsCardDemo = (): ReactElement => {
  const [activeId, setActiveId] = useState(SCENARIOS[0]!.id)
  const active = useMemo(
    () => SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0]!,
    [activeId],
  )

  useEffect(() => {
    seedSelectedContainers(active.selectedContainers)
    return () => {
      devicesStore.getState().setResetSelections()
    }
  }, [active])

  return (
    <div className="batch-container-controls-card-demo">
      <DemoPageHeader
        title="Container Controls Card"
        description={
          <>
            Controls card driven by <code>devicesStore.selectedContainers</code> — pick a scenario
            below to seed the shared Zustand store and watch the title and available actions adapt
            to the selected container types, quantity and active alarms.
          </>
        }
      />

      <div className="batch-container-controls-card-demo__controls">
        <label htmlFor="batch-container-scenario">Scenario</label>
        <select
          id="batch-container-scenario"
          value={activeId}
          onChange={(event) => setActiveId(event.target.value)}
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="batch-container-controls-card-demo__section">
        <h3>{active.title}</h3>
        <p>{active.description}</p>
        <div className="batch-container-controls-card-demo__card">
          <BatchContainerControlsCard
            isBatch={active.isBatch ?? true}
            isCompact={active.isCompact}
            alarmsDataItems={active.alarmsDataItems ?? []}
          />
        </div>
      </div>
    </div>
  )
}
