// Hook layer (@tetherto/mdk-react-adapter): fetches the summary and shapes it
// into exactly what the component renders, including loading and error states.
import { toQueryView, useMdkApp, useQuery } from '@tetherto/mdk-react-adapter'

import { fetchSummary, summaryQueryKey } from '../data/summary'

export type SummaryView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no-kernel' }
  | { status: 'ready'; stats: Array<{ label: string; value: number }> }

/** The app's summary, ready to render. */
export const useSummary = (): SummaryView => {
  // The app's routes live under the name the operator installed it as, so the
  // URL comes from useMdkApp() rather than being hardcoded.
  const { apiUrl } = useMdkApp()
  const url = apiUrl('/api/__APP_NAME__/summary')

  const query = useQuery({
    queryKey: summaryQueryKey(url),
    queryFn: () => fetchSummary(url),
    retry: false,
  })

  // Loading, or one line saying why the request failed (nothing serves the
  // route, the Gateway refused it, the app's runtime is down).
  const view = toQueryView(query, url, { unreachableHint: 'Start the stack with `mdk run`.' })
  if (view.status !== 'ready') return view
  if (!view.data.kernelConnected) return { status: 'no-kernel' }
  return {
    status: 'ready',
    stats: [
      { label: 'Workers', value: view.data.workerCount },
      { label: 'Devices', value: view.data.deviceCount },
    ],
  }
}
