import { HashBalance } from '@tetherto/mdk-react-devkit/foundation'
import { type ReactElement, useMemo } from 'react'

import { DemoPageHeader } from '../../../../components/demo-page-header'

import { buildDemoHashRevenueResponse } from './build-demo-hash-revenue-response'

export const HashBalanceDemo = (): ReactElement => {
  const demoData = useMemo(() => buildDemoHashRevenueResponse(), [])

  return (
    <>
      <DemoPageHeader title="Hash Balance" className="demo-page-header--tight" />
      <HashBalance data={demoData} />
    </>
  )
}
