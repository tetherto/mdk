import { useEffect } from 'react'

import { authStore } from '@tetherto/mdk-ui-foundation'
import { PoolManagerPools } from '@tetherto/mdk-react-devkit/domain'

import { DEMO_POOL_CONFIG } from '../../../constants/demo-pool-manager-data'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { useDemoToast } from '../../../utils/use-demo-toast'

const DEMO_PERMISSIONS = {
  superAdmin: true,
  write: true,
  permissions: ['actions:rw'],
}

export const PoolManagerPoolsPageDemo = () => {
  const { showToast, ToasterSlot } = useDemoToast()

  useEffect(() => {
    const previous = authStore.getState().permissions
    authStore.getState().setPermissions(DEMO_PERMISSIONS)
    return () => {
      authStore.getState().setPermissions(previous ?? null)
    }
  }, [])

  return (
    <div>
      <DemoPageHeader title="Pools" />
      <PoolManagerPools
        poolConfig={DEMO_POOL_CONFIG}
        backButtonClick={() => showToast('Back to Pool Manager')}
      />
      <ToasterSlot />
    </div>
  )
}
