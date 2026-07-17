/**
 * @tetherto/mdk-react-devkit
 *
 * Top-level barrel that re-exports both the generic UI primitives (`./primitives`)
 * and the mining-domain layer (`./domain`).
 *
 * For tree-shaking and clarity, prefer the subpath imports:
 *   import { Button } from "@tetherto/mdk-react-devkit/primitives";
 *   import { MinerCard } from "@tetherto/mdk-react-devkit/domain";
 *
 * Stateful and pure-TS helpers live in the adapter / foundation packages:
 *   import { useTimezoneFormatter } from "@tetherto/mdk-react-adapter";
 *   import { checkPermission } from "@tetherto/mdk-ui-foundation";
 */

// Order is load-bearing: the generic primitives barrel must be re-exported
// before the domain layer so its value exports win over any same-named
// type-only re-exports pulled in transitively by `./domain`. Do not sort.
/* eslint-disable perfectionist/sort-exports */
export * from './primitives'
export * from './domain'
/* eslint-enable perfectionist/sort-exports */

export const version = '0.0.0'
