import { SubsidyFee } from '@tetherto/mdk-react-devkit/domain'
import { type ReactElement, useMemo } from 'react'

import { DemoPageHeader } from '../../../../components/demo-page-header'

import { buildDemoSubsidyFeesResponse } from './build-demo-subsidy-fees-response'

export const SubsidyFeeDemo = (): ReactElement => {
  const demoData = useMemo(() => buildDemoSubsidyFeesResponse(), [])

  return (
    <>
      <DemoPageHeader title="Subsidy / Fee" className="demo-page-header--tight" />
      <SubsidyFee data={demoData} />
    </>
  )
}
