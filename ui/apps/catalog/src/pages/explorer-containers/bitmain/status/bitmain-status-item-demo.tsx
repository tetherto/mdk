import { StatusItem } from '@tetherto/mdk-react-devkit/foundation'
import type { ReactElement } from 'react'
import { DemoBlock } from '../../../../components/demo-block'
import { DemoPageHeader } from '../../../../components/demo-page-header'
import './bitmain-status-item-demo.scss'

/**
 * Status Item Demo
 *
 * Interactive demonstration of the status item component.
 */
export const BitmainStatusItemDemo = (): ReactElement => {
  return (
    <div className="status-item-demo">
      <DemoPageHeader
        title="Bitmain Status Item"
        description="Status indicators for Bitmain container devices across every status type."
      />
      <DemoBlock title="All Status Types">
        <div className="status-item-demo__showcase-grid">
          <StatusItem label="Normal Status" status="normal" />
          <StatusItem label="Warning Status" status="warning" />
          <StatusItem label="Fault Status" status="fault" />
          <StatusItem label="Unavailable Status" status="unavailable" />
          <StatusItem label="Undefined Status" />
        </div>
      </DemoBlock>
    </div>
  )
}
