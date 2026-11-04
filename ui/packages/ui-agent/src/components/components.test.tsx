import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PendingApproval, ToolStep } from '../core/turn'
import { TOOL_STATUS } from '../core/turn'
import { ApprovalCard, describeApproval, describeApprovalIntent } from './approval-card'
import { AssistantMessage } from './assistant-message'
import { Composer } from './composer'
import { ConversationList } from './conversation-list'
import { ToolChip } from './tool-chip'
import { AGENT_LABELS } from '../branding'

function step(overrides: Partial<ToolStep> = {}): ToolStep {
  return {
    id: 't:0',
    name: 'summarize_site',
    args: {},
    status: TOOL_STATUS.OK,
    startedAt: 0,
    endedAt: 420,
    durationMs: 420,
    ...overrides,
  }
}

const approval: PendingApproval = {
  approvalId: 'ap-1',
  name: 'act_device',
  args: { ref: 'demo-miner-a-0', action: 'reboot' },
  toolStepId: 't:0',
  at: 0,
}

describe('ToolChip', () => {
  it('renders the supplied label and the duration', () => {
    render(<ToolChip step={step()} toolLabels={{ summarize_site: 'Site status' }} />)
    expect(screen.getByText('Site status')).toBeInTheDocument()
    expect(screen.getByText('· 0.4s')).toBeInTheDocument()
  })

  it('humanizes a tool the host did not name', () => {
    render(<ToolChip step={step({ name: 'inspect_transformer' })} />)
    expect(screen.getByText('Inspect transformer')).toBeInTheDocument()
  })

  it('says what it is doing while the tool is still running', () => {
    render(<ToolChip step={step({ status: TOOL_STATUS.RUNNING, durationMs: undefined })} />)
    expect(screen.getByText('· running…')).toBeInTheDocument()
  })

  it('says it is blocked while the approval is outstanding', () => {
    render(
      <ToolChip step={step({ status: TOOL_STATUS.AWAITING_APPROVAL, durationMs: undefined })} />,
    )
    expect(screen.getByText('· awaiting approval')).toBeInTheDocument()
  })

  it('claims neither success nor failure for a call that never reported back', () => {
    // The turn ended first, so whether the tool ran is genuinely unknown — and the
    // elapsed time would measure the failure rather than the tool.
    render(<ToolChip step={step({ status: TOOL_STATUS.INTERRUPTED, durationMs: 8_000 })} />)

    expect(screen.getByText('· no result')).toBeInTheDocument()
  })
})

describe('AssistantMessage', () => {
  it('renders a finished answer as markdown', () => {
    render(<AssistantMessage text={'Site is healthy.\n\n- 8 miners\n- 0 offline'} />)
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('8 miners')).toBeInTheDocument()
  })

  it('renders a streaming answer as plain text', () => {
    // Markdown mid-stream reflows on every token and breaks on a half-written
    // fence, so the switch happens when the turn finishes.
    const { container } = render(<AssistantMessage text="Site is heal" streaming />)
    expect(container.querySelector('.mdk-agent-markdown--streaming')).toBeInTheDocument()
  })

  it('shows the thinking indicator before any text arrives', () => {
    const { container } = render(<AssistantMessage text="" streaming />)
    expect(container.querySelector('.mdk-loader')).toBeInTheDocument()
  })

  it('labels a leaked tool call instead of dumping JSON at the operator', () => {
    render(<AssistantMessage text={'```json\n{"tool":"count_devices","args":{}}\n```'} />)

    expect(screen.getByText(/malformed tool call/i)).toBeInTheDocument()
    expect(screen.getByText('count_devices')).toBeInTheDocument()
  })

  it('does not run the leak check mid-stream, when a partial answer looks like JSON', () => {
    render(<AssistantMessage text={'{"tool":"count_devices","args":{}}'} streaming />)
    expect(screen.queryByText(/malformed tool call/i)).not.toBeInTheDocument()
  })

  it('suppresses the chip for the step its approval card already describes', () => {
    const gated = step({ id: 'call:1', name: 'act_device', status: TOOL_STATUS.AWAITING_APPROVAL })
    const { container } = render(
      <AssistantMessage
        text=""
        tools={[gated]}
        approval={{ ...approval, toolStepId: 'call:1' }}
        onDecide={vi.fn()}
      />,
    )

    // Scoped to the chip row — "Act device" legitimately appears in the card's
    // own Action row, which is what makes the chip redundant.
    expect(container.querySelector('.mdk-agent-message__tools')).not.toBeInTheDocument()
    expect(screen.getByText(AGENT_LABELS.approvalRequired)).toBeInTheDocument()
  })

  it('still shows chips for earlier steps that already settled', () => {
    render(
      <AssistantMessage
        text=""
        tools={[step({ id: 'call:0' }), step({ id: 'call:1', name: 'act_device', status: TOOL_STATUS.AWAITING_APPROVAL })]}
        approval={{ ...approval, toolStepId: 'call:1' }}
        onDecide={vi.fn()}
      />,
    )

    expect(screen.getByText('Summarize site')).toBeInTheDocument()
  })

  it('says so when an answer consulted no tools', () => {
    // The agent's premise is that fleet facts come from tools; a turn with none
    // answered from the model alone, which is where fabricated writes come from.
    render(
      <AssistantMessage
        question="Reboot demo-miner-a-0"
        text="The reboot command was sent to demo-miner-a-0."
      />,
    )
    expect(screen.getByText(/no tools used/)).toBeInTheDocument()
  })

  it('leaves the note off a greeting, where consulting nothing was right', () => {
    render(<AssistantMessage question="Hey what's up?" text="Hello — what can I check for you?" />)
    expect(screen.queryByText(/no tools used/)).not.toBeInTheDocument()
  })

  it('says nothing of the sort when a tool did run', () => {
    render(<AssistantMessage text="Reboot queued." tools={[step({ name: 'act_device' })]} />)
    expect(screen.queryByText(/no tools used/)).not.toBeInTheDocument()
  })

  it('waits for the turn to settle before claiming no tools were used', () => {
    // Mid-stream the tool may simply not have been called yet.
    render(<AssistantMessage text="The reboot command" streaming />)
    expect(screen.queryByText(/no tools used/)).not.toBeInTheDocument()
  })

  it('does not add the note to a leaked tool call or an errored turn', () => {
    const { rerender } = render(
      <AssistantMessage text={'```json\n{"tool":"act_device","args":{}}\n```'} />,
    )
    expect(screen.queryByText(/no tools used/)).not.toBeInTheDocument()

    rerender(<AssistantMessage text="Something broke." error="The agent could not complete that request." />)
    expect(screen.queryByText(/no tools used/)).not.toBeInTheDocument()
  })

  it('surfaces a turn error', () => {
    render(<AssistantMessage text="" error="The agent could not complete that request." />)
    expect(screen.getByRole('alert')).toHaveTextContent('could not complete')
  })

  it('reads an ERR_ code out as a sentence, keeping the code under Details', () => {
    // The reducer records what the `error` event carried, which is a bare code.
    // The sentence is what the operator reads; the code is what a bug report
    // needs, so it is folded away rather than dropped.
    render(<AssistantMessage text="" error="ERR_AGENT_STREAM_TRUNCATED" />)

    expect(screen.getByRole('alert')).toHaveTextContent('ended before the answer finished')

    const details = screen.getByText('Details').closest('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')
    expect(details).toHaveTextContent('ERR_AGENT_STREAM_TRUNCATED')
  })

  it('does not offer a retry that cannot work', () => {
    // Re-sending to a stack with no agent app fails identically, so the button
    // would only teach the operator that it does nothing.
    render(<AssistantMessage text="" error="ERR_AGENT_ROUTES_NOT_MOUNTED" onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('no agent app installed')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('disables the retry while the browser says it is offline', () => {
    render(
      <AssistantMessage text="" error="ERR_AGENT_OFFLINE" isOnline={false} onRetry={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent("You're offline")
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled()
  })

  it('offers a retry on a failed turn, so the question is not retyped', async () => {
    const onRetry = vi.fn()
    render(<AssistantMessage text="" error="ERR_AGENT_STREAM_TRUNCATED" onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('says an interrupted answer is not the whole answer', () => {
    // Whatever streamed is kept, but it must not read back later as the agent's
    // full statement.
    render(<AssistantMessage text="Rebooting demo-mi" interrupted />)

    expect(screen.getByText(/Stopped early/)).toBeInTheDocument()
  })

  it('collapses an answer long enough to bury the transcript', async () => {
    const long = `${'Site status.\n\n'.repeat(300)}THE VERY END`
    render(<AssistantMessage text={long} />)

    expect(screen.queryByText(/THE VERY END/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show full answer' }))
    expect(screen.getByText(/THE VERY END/)).toBeInTheDocument()
  })

  it('never collapses a turn that is still streaming', () => {
    // Hiding the tail would hide the thing the operator is watching arrive.
    const long = `${'Site status.\n\n'.repeat(300)}THE LATEST TOKEN`
    render(<AssistantMessage text={long} streaming />)

    expect(screen.queryByRole('button', { name: 'Show full answer' })).not.toBeInTheDocument()
    expect(screen.getByText(/THE LATEST TOKEN/)).toBeInTheDocument()
  })
})

describe('describeApproval', () => {
  it('names the target device from whichever arg carries it', () => {
    expect(describeApproval(approval, { act_device: 'Send command' })).toEqual([
      { label: 'Action', value: 'Send command' },
      { label: 'Device', value: 'demo-miner-a-0' },
      // Not "Action" a second time: the tool row and the tool's `action`
      // argument would otherwise carry the same label.
      { label: 'Command', value: 'reboot' },
    ])
  })

  it('humanizes an argument name it has no friendlier label for', () => {
    const rows = describeApproval({ ...approval, name: 'do_thing', args: { target_rack: 3 } })
    expect(rows).toEqual([
      { label: 'Action', value: 'Do thing' },
      { label: 'Target rack', value: '3' },
    ])
  })
})

describe('describeApprovalIntent', () => {
  it('says what the operator is about to allow', () => {
    // Synthesized, because the model has emitted no tokens at this point in the
    // turn — the approval sits between the tool_call and its result.
    expect(describeApprovalIntent(approval, { act_device: 'Send command' })).toBe(
      'This runs send command on demo-miner-a-0. Review and approve to proceed.',
    )
  })

  it('drops the target clause for a tool with no recognised device arg', () => {
    expect(describeApprovalIntent({ ...approval, name: 'purge_cache', args: {} })).toBe(
      'This runs purge cache. Review and approve to proceed.',
    )
  })
})

describe('ApprovalCard', () => {
  it('sends true on approve and false on reject', async () => {
    const onDecide = vi.fn()
    render(<ApprovalCard approval={approval} onDecide={onDecide} />)

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onDecide).toHaveBeenCalledWith(true)

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
    expect(onDecide).toHaveBeenCalledWith(false)
  })

  it('locks both buttons once a decision is in flight', () => {
    render(<ApprovalCard approval={approval} pending onDecide={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled()
  })
})

describe('Composer', () => {
  it('sends on Enter and clears', async () => {
    const onSend = vi.fn()
    render(<Composer onSend={onSend} />)

    const input = screen.getByRole('textbox', { name: AGENT_LABELS.composer })
    await userEvent.type(input, 'How many miners are there?{Enter}')

    expect(onSend).toHaveBeenCalledWith('How many miners are there?')
    expect(input).toHaveValue('')
  })

  it('breaks the line on Shift+Enter instead of sending', async () => {
    const onSend = vi.fn()
    render(<Composer onSend={onSend} />)

    await userEvent.type(
      screen.getByRole('textbox', { name: AGENT_LABELS.composer }),
      'first{Shift>}{Enter}{/Shift}second',
    )

    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends nothing for whitespace', async () => {
    const onSend = vi.fn()
    render(<Composer onSend={onSend} />)

    await userEvent.type(screen.getByRole('textbox', { name: AGENT_LABELS.composer }), '   {Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('takes focus back when the turn releases the input', async () => {
    // Disabling a focused textarea blurs it, so without a hand-back the caret is
    // gone after every message.
    const { rerender } = render(<Composer onSend={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: AGENT_LABELS.composer })

    await userEvent.type(input, 'How many miners are there?{Enter}')
    rerender(<Composer disabled onSend={vi.fn()} />)

    // A browser blurs a control when it is disabled; happy-dom does not, so
    // focus is moved away explicitly to stand in for that.
    const elsewhere = document.createElement('button')
    document.body.append(elsewhere)
    elsewhere.focus()
    expect(input).not.toHaveFocus()

    rerender(<Composer onSend={vi.fn()} />)
    expect(input).toHaveFocus()
  })

  it('does not grab focus when a turn ends that this composer did not start', () => {
    // e.g. a turn finishing while the operator is reading the conversation list.
    const { rerender } = render(<Composer disabled onSend={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: AGENT_LABELS.composer })

    rerender(<Composer onSend={vi.fn()} />)
    expect(input).not.toHaveFocus()
  })

  it('focuses when the conversation changes, so a new one is ready to type in', () => {
    const { rerender } = render(<Composer focusKey="c1" onSend={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: AGENT_LABELS.composer })
    expect(input).not.toHaveFocus()

    rerender(<Composer focusKey="c2" onSend={vi.fn()} />)
    expect(input).toHaveFocus()
  })

  it('does not focus on first render, so mounting never steals focus from the host', () => {
    render(<Composer focusKey="c1" onSend={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: AGENT_LABELS.composer })).not.toHaveFocus()
  })

  it('is inert while the session is busy', async () => {
    const onSend = vi.fn()
    render(<Composer disabled onSend={onSend} />)

    expect(screen.getByRole('textbox', { name: AGENT_LABELS.composer })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('offers Stop while a turn streams, so it can be interrupted', async () => {
    // Without it the only way out of a turn going wrong is reloading the page.
    const onStop = vi.fn()
    render(<Composer disabled isStreaming onSend={vi.fn()} onStop={onStop} />)

    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).toHaveBeenCalled()
  })

  it('does not offer Stop when the composer is disabled for another reason', () => {
    render(<Composer disabled onSend={vi.fn()} onStop={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })
})

describe('ConversationList', () => {
  const conversations = [
    {
      id: 'c1',
      title: 'Site status',
      sessionId: 'sess-1',
      messages: [],
      createdAt: 1_000,
      updatedAt: Date.now(),
    },
    {
      id: 'c2',
      title: 'Pool hashrate mismatch',
      sessionId: null,
      messages: [],
      createdAt: 500,
      updatedAt: Date.now() - 86_400_000,
    },
  ]

  it('badges only the conversation with a turn in flight', () => {
    render(
      <ConversationList
        conversations={conversations}
        activeId="c1"
        runningId="c1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getAllByText('Idle')).toHaveLength(1)
  })

  it('selects a conversation on click', async () => {
    const onSelect = vi.fn()
    render(
      <ConversationList
        conversations={conversations}
        activeId="c1"
        onSelect={onSelect}
        onCreate={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Pool hashrate mismatch'))
    expect(onSelect).toHaveBeenCalledWith('c2')
  })

  it('deletes only after a confirmation step', async () => {
    // The transcript exists nowhere else — the gateway keeps no history — so a
    // single misclick must not destroy it.
    const onDelete = vi.fn()
    render(
      <ConversationList
        conversations={conversations}
        activeId="c1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Delete conversation: Site status/ }))
    expect(onDelete).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith('c1')
  })

  it('cancels a pending delete', async () => {
    const onDelete = vi.fn()
    render(
      <ConversationList
        conversations={conversations}
        activeId="c1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Delete conversation: Site status/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Delete conversation: Site status/ })).toBeInTheDocument()
  })

  it('will not delete the conversation whose turn is streaming', () => {
    // Removing it would strand the open stream with nowhere to write its result.
    render(
      <ConversationList
        conversations={conversations}
        activeId="c1"
        runningId="c1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Delete conversation: Site status/ })).toBeDisabled()
  })

  it('hides the delete affordance entirely when no handler is given', () => {
    render(
      <ConversationList
        conversations={conversations}
        activeId="c1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /Delete conversation/ })).not.toBeInTheDocument()
  })

  it('offers a way out when there is nothing yet', () => {
    render(
      <ConversationList
        conversations={[]}
        activeId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new conversation/i })).toBeInTheDocument()
  })
})

describe('ConversationList — the delete confirmation', () => {
  const rows = [
    {
      id: 'c1',
      title: 'Site status',
      sessionId: 'sess-1',
      messages: [],
      createdAt: 1_000,
      updatedAt: Date.now(),
    },
  ]

  const renderList = (onDelete = vi.fn()) => {
    render(
      <ConversationList
        conversations={rows}
        activeId="c1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />,
    )
    return onDelete
  }

  const openConfirm = async () =>
    userEvent.click(screen.getByRole('button', { name: /Delete conversation: Site status/ }))

  it('leaves the row intact, status and all', async () => {
    // The buttons used to replace the badge, so the status the operator was
    // deciding about disappeared at the moment they needed it.
    renderList()
    await openConfirm()

    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(screen.getByText('Site status')).toBeInTheDocument()
    expect(screen.getByText(/messages/)).toBeInTheDocument()
    expect(screen.getByText('Delete this conversation?')).toBeInTheDocument()
  })

  it('puts focus on Cancel, not on the destructive button', async () => {
    // The strip opens under the pointer; Delete must not be one stray Enter away.
    renderList()
    await openConfirm()

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('backs out on Escape', async () => {
    const onDelete = renderList()
    await openConfirm()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByText('Delete this conversation?')).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })
})

describe('Composer — the auto-grow', () => {
  // happy-dom lays nothing out, so the box model the effect reads is supplied
  // here: the real stylesheet's 19px line, 10px padding each side, 1px border.
  const LINE = 19
  const PADDING = 20
  const BORDERS = 2

  function withBoxModel(textHeight: number) {
    const style = {
      lineHeight: `${LINE}px`,
      paddingTop: '10px',
      paddingBottom: '10px',
      borderTopWidth: '1px',
      borderBottomWidth: '1px',
      boxSizing: 'border-box',
    } as CSSStyleDeclaration

    vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue(style)
    vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockReturnValue(
      textHeight + PADDING,
    )
  }

  afterEach(() => vi.restoreAllMocks())

  it('adds the box chrome on top of the text rather than inside it', async () => {
    // Two lines of text should be two lines tall, plus the padding and borders
    // that are not text. `scrollHeight` already carries the padding, so it has
    // to come off before the cap is applied and go back on after.
    withBoxModel(LINE * 2)
    render(<Composer onSend={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox'), 'a')

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).style.height).toBe(
      `${LINE * 2 + PADDING + BORDERS}px`,
    )
  })

  it('caps at MAX_ROWS of readable text, not of box', async () => {
    // The cap used to be compared against `scrollHeight` with the padding still
    // in it, so the box stopped a row early and then stood a row of padding
    // taller than the number claimed — which is what kept eating the transcript.
    withBoxModel(LINE * 40)
    render(<Composer onSend={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox'), 'a')

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).style.height).toBe(
      `${LINE * 5 + PADDING + BORDERS}px`,
    )
  })
})
