import { StatusItem } from '@tetherto/foundation'
import type { ReactElement } from 'react'
import './bitmain-status-item-demo.scss'

/**
 * Status Item Demo
 *
 * Interactive demonstration of status item component
 */
export const BitmainStatusItemDemo = (): ReactElement => {
  return (
    <div className="status-item-demo">
      <h3>All Status Types</h3>
      <div className="status-item-demo__showcase">
        <div className="status-item-demo__showcase-grid">
          <StatusItem label="Normal Status" status="normal" />
          <StatusItem label="Warning Status" status="warning" />
          <StatusItem label="Fault Status" status="fault" />
          <StatusItem label="Unavailable Status" status="unavailable" />
          <StatusItem label="Undefined Status" />
        </div>
      </div>
    </div>
  )
}
