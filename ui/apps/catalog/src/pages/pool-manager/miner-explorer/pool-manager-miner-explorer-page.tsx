import { useEffect } from 'react'

import { authStore } from '@tetherto/mdk-ui-core'
import { PoolManagerMinerExplorer } from '@tetherto/mdk-react-devkit/foundation'

import { DEMO_MINERS, DEMO_POOL_CONFIG } from '../../../constants/demo-pool-manager-data'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { useDemoToast } from '../../../utils/use-demo-toast'

const DEMO_PERMISSIONS = {
  superAdmin: true,
  write: true,
  permissions: ['actions:rw'],
}

/**
 * Pool Manager Miner Explorer demo. In production, replace
 * `DEMO_MINERS` with `useGetAvailableDevices()` from
 * `@tetherto/mdk-react-adapter`, and `DEMO_POOL_CONFIG` with your
 * pool-config fetch. See ../../../constants/demo-pool-manager-data.ts.
 */
export const PoolManagerMinerExplorerPageDemo = () => {
  const { showToast, ToasterSlot } = useDemoToast()

  useEffect(() => {
    const previous = authStore.getState().permissions
    authStore.getState().setPermissions(DEMO_PERMISSIONS)
    return () => {
      authStore.getState().setPermissions(previous ?? null)
    }
  }, [])

  return (
    <div className="mdk-pm-miner-explorer-page-demo">
      <DemoPageHeader title="Miner Explorer" />
      <PoolManagerMinerExplorer
        miners={DEMO_MINERS}
        poolConfig={DEMO_POOL_CONFIG}
        backButtonClick={() => showToast('Back to Pool Manager')}
      />
      <ToasterSlot />
    </div>
  )
}
