/**
 * The id of the app this package talks to, `@tetherto/mdk-app-agent`, from its
 * `mdk-app.yaml`. A shell looks for it in the installed apps to decide whether
 * to mount the co-pilot.
 */
export const AGENT_APP_ID = 'io.tether.agent'

/**
 * Whether the stack carries the agent app, which serves the `/agent/*` routes
 * the co-pilot talks to. Matched by id, not by installed name, which is the
 * operator's to choose. The agent app ships no UI, so look it up in the whole
 * app list (`useInstalledApps`), not only in the apps whose UI loaded.
 */
export const hasAgentApp = (apps: readonly { id: string }[] | undefined): boolean =>
  apps?.some((app) => app.id === AGENT_APP_ID) ?? false
