import { Button } from '@tetherto/mdk-react-devkit/primitives'
import type { FormEvent, JSX, KeyboardEvent } from 'react'
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { AGENT_LABELS } from '../branding'
import { SendIcon, StopIcon } from './icons'

/**
 * Grows with the text up to this many rows of text, then scrolls.
 *
 * Counted in rows the operator can actually read, not in box height: the cap is
 * applied to the text area and the box's own padding and borders are added back
 * on top, so five here means five visible lines.
 */
const MAX_ROWS = 5

export type ComposerProps = {
  disabled?: boolean
  /**
   * A turn is running. Kept separate from `disabled` — which is about the input —
   * because this swaps Send for Stop, and a composer disabled for any other reason
   * must not offer to stop a turn that is not there.
   */
  isStreaming?: boolean
  placeholder?: string
  /**
   * Changing this focuses the input — used when the panel switches conversation,
   * so starting a new one lands the caret where you are about to type. Ignored on
   * first render, so mounting the panel never steals focus from the host page.
   */
  focusKey?: string | number | null
  onSend: (text: string) => void
  /** Aborts the running turn. Without it a turn going wrong can only be escaped by reloading. */
  onStop?: VoidFunction
}

/**
 * The input row: auto-growing, Enter sends, Shift+Enter breaks the line.
 *
 * `disabled` is driven by the session being busy, not by a local guard — the
 * gateway allows one turn at a time per session and answers a second POST with
 * a 409, and a turn paused on an approval still counts as busy.
 */
const ComposerView = ({
  disabled = false,
  isStreaming = false,
  placeholder = AGENT_LABELS.placeholder,
  focusKey = null,
  onSend,
  onStop,
}: ComposerProps): JSX.Element => {
  const [value, setValue] = useState('')
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const refocusRef = useRef(false)

  /**
   * Hands focus back when the turn releases the input.
   *
   * Disabling a focused `<textarea>` makes the browser blur it, so without this
   * the caret is gone after every message and the next one needs a click. Armed
   * only by an actual submit, so a turn finishing never steals focus from
   * somewhere else the operator has moved to.
   */
  useEffect(() => {
    if (disabled || !refocusRef.current) return
    refocusRef.current = false
    textAreaRef.current?.focus()
  }, [disabled])

  // Focus on a conversation change, but not on the first render — mounting the
  // panel (or a route page) must not pull focus out of whatever the host had.
  const lastFocusKeyRef = useRef<string | number | null | undefined>(undefined)
  useEffect(() => {
    const previous = lastFocusKeyRef.current
    lastFocusKeyRef.current = focusKey
    // `disabled` is a dependency only so the focus lands after the input is
    // usable again; a change to it alone must not count as a conversation
    // switch, or every finished turn would grab focus.
    if (previous === undefined || previous === focusKey || disabled) return
    textAreaRef.current?.focus()
  }, [focusKey, disabled])

  /**
   * The devkit `TextArea` is a plain `<textarea>` with no auto-grow, so the
   * height is measured here: reset first, otherwise scrollHeight only ever
   * grows and the box never shrinks back after a deletion.
   *
   * The box chrome has to be accounted for explicitly, which is what #2 was.
   * `scrollHeight` is content *plus* padding, and it was being clamped against
   * a bare `lineHeight * MAX_ROWS` — so the cap was reached a row early while
   * the height it then set was a full row of padding taller than it claimed,
   * and the composer kept eating the transcript above it. The cap now bounds
   * the text alone and the padding and borders are added back after, so
   * MAX_ROWS is a count of readable lines. `box-sizing: border-box` is pinned
   * in the stylesheet, so the border belongs in the number written out.
   */
  useLayoutEffect(() => {
    const node = textAreaRef.current
    if (!node) return
    node.style.height = 'auto'

    const style = globalThis.getComputedStyle(node)
    const px = (value: string) => Number.parseFloat(value) || 0
    // `lineHeight` resolves to `normal` when the cascade never sets one.
    const lineHeight = px(style.lineHeight) || 20
    const padding = px(style.paddingTop) + px(style.paddingBottom)
    const borders = px(style.borderTopWidth) + px(style.borderBottomWidth)

    const text = node.scrollHeight - padding
    node.style.height = `${Math.min(text, lineHeight * MAX_ROWS) + padding + borders}px`
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    setValue('')
    refocusRef.current = true
    onSend(text)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // `isComposing` guards IME candidate selection, where Enter commits the
    // candidate rather than the message.
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    submit()
  }

  return (
    <form className="mdk-agent-composer" onSubmit={handleSubmit}>
      <textarea
        ref={textAreaRef}
        className="mdk-agent-composer__input"
        rows={1}
        value={value}
        placeholder={placeholder}
        aria-label={AGENT_LABELS.composer}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isStreaming && onStop
        ? (
            <Button
              type="button"
              variant="primary"
              className="mdk-agent-composer__send"
              aria-label="Stop"
              icon={<StopIcon size={18} />}
              onClick={onStop}
            />
          )
        : (
            <Button
              type="submit"
              variant="primary"
              className="mdk-agent-composer__send"
              aria-label="Send"
              disabled={disabled || value.trim().length === 0}
              icon={<SendIcon size={18} />}
            />
          )}
    </form>
  )
}

export const Composer = memo(ComposerView)
