import { useInstalledApps } from '@tetherto/mdk-react-adapter'
import { hasAgentApp } from '@tetherto/mdk-ui-agent'

import { AGENT_COPILOT } from '../constants/env'

/**
 * Whether to mount the co-pilot: the stack installs the agent app, or
 * `VITE_AGENT_COPILOT=true` says the Gateway carries it anyway.
 *
 * Reads the whole app list, not only the apps with a UI: the agent app ships
 * none. It is the request `useInstalledAppUis` makes, so it costs nothing extra.
 * Until the list loads (or if it fails) the answer is no.
 */
export const useShowCoPilot = (): boolean => {
  const { apps } = useInstalledApps()
  return AGENT_COPILOT || hasAgentApp(apps)
}
