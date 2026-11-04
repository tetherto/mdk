/**
 * Drift guard for the one place this package reads the producer's prose.
 *
 * A refused write comes back as a plain `tool_result` with no `isError`, so the
 * only thing distinguishing "the operator said no" from "it ran fine" is the
 * result text — and that text is a bare literal in
 * `backend/core/agent/src/loop.js`, not an exported constant. If it is reworded,
 * rejected writes silently start rendering with a success tick, which is exactly
 * the wrong thing to tell someone who just refused a command.
 *
 * Skipped when the backend is absent, so a standalone `ui/` checkout still passes.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { isRejectionResult } from './turn'

const PRODUCER = resolve(
  dirname(fileURLToPath(import.meta.url)),
  // src/core -> src -> ui-agent -> packages -> ui -> repo root
  '../../../../../backend/core/agent/src/loop.js',
)

const source = existsSync(PRODUCER) ? readFileSync(PRODUCER, 'utf8') : null

describe.skipIf(source === null)('rejected-write marker', () => {
  it('still matches the text the producer emits for a declined approval', () => {
    // The rejection branch reads:
    //   yield { type: EVENT.TOOL_RESULT, name: call.tool, text: '(rejected by operator — not executed)' }
    const emitted = /EVENT\.TOOL_RESULT[^}]*text:\s*'([^']*rejected[^']*)'/.exec(source ?? '')?.[1]

    expect(emitted, 'no rejection tool_result found in loop.js').toBeTruthy()
    expect(isRejectionResult(emitted!)).toBe(true)
  })

  it('still matches the text the producer emits for an approval that expired', () => {
    const emitted = /EVENT\.TOOL_RESULT[^}]*text:\s*'([^']*approval expired[^']*)'/.exec(source ?? '')?.[1]

    expect(emitted, 'no expired-approval tool_result found in loop.js').toBeTruthy()
    expect(isRejectionResult(emitted!)).toBe(true)
  })

  it('does not mistake an ordinary tool result for a refusal', () => {
    expect(isRejectionResult('{"summary":"Reboot on demo-miner-a-0: queued."}')).toBe(false)
    expect(isRejectionResult('The operator rejected it earlier')).toBe(false)
  })
})
