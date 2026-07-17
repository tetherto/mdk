/**
 * Runnable example for ActionsSidebar.
 *
 * The sidebar reads all state from `actionsStore` and the `useLiveActions`
 * hook internally — no data props are required. Mount it once at the
 * application root alongside the main content outlet. When the operator
 * pins the sidebar it enters a flex side-by-side layout, so the parent
 * must use `display: flex; flex-direction: row`.
 *
 * Requires MdkProvider (QueryClient + auth) higher in the tree.
 */
import { useActions } from '@tetherto/mdk-react-adapter'
import { ActionsSidebar } from '@tetherto/mdk-react-devkit'

import './actions-sidebar.example.scss'

export const ActionsSidebarExample = () => {
  const { setAddPendingSubmissionAction, pendingSubmissions } = useActions()

  const stageSample = () => {
    setAddPendingSubmissionAction({
      action: 'setupPools',
      query: { id: { $in: ['miner-1', 'miner-2'] } },
      params: [{ poolConfigId: 'pool-abc', configType: 'pool' }],
    })
  }

  return (
    <div className="mdk-actions-sidebar-example">
      {/* Main content area */}
      <main className="mdk-actions-sidebar-example__main">
        <button type="button" onClick={stageSample} disabled={pendingSubmissions.length > 0}>
          Stage a sample draft action
        </button>
      </main>

      {/* Sidebar — reads actionsStore + live actions internally */}
      <ActionsSidebar />
    </div>
  )
}
