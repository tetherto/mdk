/**
 * @tetherto/mdk-react-devkit
 *
 * Top-level barrel that re-exports both the generic UI primitives (`./core`)
 * and the mining-domain layer (`./foundation`).
 *
 * For tree-shaking and clarity, prefer the subpath imports:
 *   import { Button } from "@tetherto/mdk-react-devkit/core";
 *   import { MinerCard } from "@tetherto/mdk-react-devkit/foundation";
 *
 * Stateful and pure-TS helpers live in the adapter / core packages:
 *   import { useTimezoneFormatter } from "@tetherto/mdk-react-adapter";
 *   import { checkPermission } from "@tetherto/mdk-ui-core";
 */

export * from './core'
export * from './foundation'

export const version = '0.0.0'
