// Data layer (@tetherto/mdk-ui-foundation): the contract with the app's own
// backend — the response type, its query key and the request. No React here.
import { mdkFetch } from '@tetherto/mdk-ui-foundation'

// The response type comes from the app's backend (`plugin/types.d.ts`), the
// same type its controller is checked against, so the two cannot drift.
// `import type` is erased at build: nothing from plugin/ ships in ui/index.js.
import type { Summary } from '../../plugin/types'

export type { Summary }

/** Query key for the summary at one URL. */
export const summaryQueryKey = (url: string) => ['__APP_NAME__', 'summary', url] as const

/** GET the summary, with the signed-in operator's token. */
export const fetchSummary = (url: string): Promise<Summary> => mdkFetch<Summary>(url)
