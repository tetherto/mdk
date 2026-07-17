// @vitest-environment jsdom
import { actionsStore } from '@tetherto/mdk-ui-foundation'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ACTION_TYPES } from '../../../../constants/actions'
import { ActionsSidebar } from '../actions-sidebar'

// ---------------------------------------------------------------------------
// Hoisted mocks (must run before any imports are resolved)
// ---------------------------------------------------------------------------

const {
  mockNotifyError,
  mockNotifySuccess,
  mockSubmit,
  mockSubmitSingle,
  mockCancel,
  mockVote,
  mockLiveActions,
} = vi.hoisted(() => ({
  mockNotifyError: vi.fn(),
  mockNotifySuccess: vi.fn(),
  mockSubmit: vi.fn(async () => undefined),
  mockSubmitSingle: vi.fn(async () => [{ id: 99 }]),
  mockCancel: vi.fn(async () => undefined),
  mockVote: vi.fn(async () => undefined),
  mockLiveActions: vi.fn(() => ({
    myVoting: [],
    myReady: [],
    myExecuting: [],
    myDone: [],
    othersVoting: [],
    canApprove: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}))

vi.mock('@domain/utils/notification-utils', () => ({
  notifySuccess: mockNotifySuccess,
  notifyError: mockNotifyError,
}))

vi.mock('@tetherto/mdk-react-adapter', async (importOriginal) => {
  // Keep useActions real so it reads/writes the real actionsStore
  const actual = await importOriginal<typeof import('@tetherto/mdk-react-adapter')>()
  return {
    ...actual,
    useLiveActions: mockLiveActions,
    useSubmitPendingActions: vi.fn(() => ({
      submit: mockSubmit,
      isSubmitting: false,
      pendingCount: actionsStore.getState().pendingSubmissions.length,
    })),
    useSubmitSingleAction: vi.fn(() => ({
      submitSingle: mockSubmitSingle,
      isSubmitting: false,
      submittingActionId: null,
    })),
    useCancelAction: vi.fn(() => ({
      cancel: mockCancel,
      isCancelling: false,
    })),
    useVoteOnAction: vi.fn(() => ({
      vote: mockVote,
      isVoting: false,
    })),
  }
})

vi.mock('@primitives/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives/index')>()
  return {
    ...actual,
    Button: ({
      children,
      onClick,
      disabled,
      icon,
      'aria-label': ariaLabel,
    }: {
      children?: React.ReactNode
      onClick?: () => void
      disabled?: boolean
      icon?: React.ReactNode
      'aria-label'?: string
    }) => (
      <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
        {icon}
        {children}
      </button>
    ),
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div data-testid="confirm-dialog">{children}</div> : null,
    DialogContent: ({ children, title }: { children: React.ReactNode; title: string }) => (
      <div data-title={title}>{children}</div>
    ),
    DialogFooter: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dialog-footer">{children}</div>
    ),
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const seedRegister = (name: string) =>
  actionsStore.getState().setAddPendingSubmissionAction({
    type: 'voting',
    action: ACTION_TYPES.REGISTER_POOL_CONFIG,
    params: [{ type: 'pool', data: { poolConfigName: name } }],
  })

const seedAssign = (ids: string[]) =>
  actionsStore.getState().setAddPendingSubmissionAction({
    action: ACTION_TYPES.SETUP_POOLS,
    query: { id: { $in: ids } },
    params: [{ poolConfigId: 'p1', configType: 'pool' }],
  })

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActionsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    actionsStore.getState().clearAllPendingSubmissions()
    actionsStore.getState().setSidebarOpen(true)
    actionsStore.getState().setSidebarPinned(false)
    mockLiveActions.mockReturnValue({
      myVoting: [],
      myReady: [],
      myExecuting: [],
      myDone: [],
      othersVoting: [],
      canApprove: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  afterEach(() => {
    actionsStore.getState().clearAllPendingSubmissions()
    actionsStore.getState().setSidebarOpen(false)
    actionsStore.getState().setSidebarPinned(false)
  })

  // ─── Empty state ──────────────────────────────────────────────────────────

  it('shows "No pending actions." when there are no drafts, in-review, or requested', () => {
    render(<ActionsSidebar />)
    expect(screen.getByText('No pending actions.')).toBeInTheDocument()
  })

  // ─── Header title ─────────────────────────────────────────────────────────

  it('shows "0 Actions Pending Submission" when the queue is empty', () => {
    render(<ActionsSidebar />)
    expect(screen.getByText('0 Actions Pending Submission')).toBeInTheDocument()
  })

  it('shows "1 Action Pending Submission" for a single draft', () => {
    seedRegister('TestPool')
    render(<ActionsSidebar />)
    expect(screen.getByText('1 Action Pending Submission')).toBeInTheDocument()
  })

  // ─── Draft cards ──────────────────────────────────────────────────────────

  it('renders a draft card with title, badge, and Discard/Submit buttons', () => {
    seedRegister('AlphaPool')
    render(<ActionsSidebar />)

    // describePendingActionExpanded returns title='ADD POOL CONFIG' for REGISTER_POOL_CONFIG
    expect(screen.getByText('ADD POOL CONFIG')).toBeInTheDocument()
    expect(screen.getByText('Pending Submission')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('removes a draft from the queue when Discard is clicked', () => {
    seedRegister('DiscardMe')
    render(<ActionsSidebar />)

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(actionsStore.getState().pendingSubmissions).toHaveLength(0)
  })

  it('calls submitSingle with the action id when Submit is clicked', async () => {
    seedRegister('SubmitMe')
    const actionId = actionsStore.getState().pendingSubmissions[0]!.id

    render(<ActionsSidebar />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    })

    expect(mockSubmitSingle).toHaveBeenCalledWith(actionId)
  })

  // ─── Bulk footer ──────────────────────────────────────────────────────────

  it('shows Submit All / Discard All buttons when there are more than 1 draft', () => {
    seedRegister('Pool A')
    seedAssign(['d1'])
    render(<ActionsSidebar />)

    expect(screen.getByRole('button', { name: 'Submit All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard All' })).toBeInTheDocument()
  })

  it('does not show bulk footer for a single draft', () => {
    seedRegister('Only One')
    render(<ActionsSidebar />)

    expect(screen.queryByRole('button', { name: 'Submit All' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discard All' })).not.toBeInTheDocument()
  })

  // ─── Discard All confirmation dialog ─────────────────────────────────────

  it('opens a confirm dialog when Discard All is clicked', () => {
    seedRegister('Pool A')
    seedAssign(['d1'])
    render(<ActionsSidebar />)

    fireEvent.click(screen.getByRole('button', { name: 'Discard All' }))
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
  })

  it('clears all drafts when the discard confirm dialog is confirmed', async () => {
    seedRegister('Pool A')
    seedAssign(['d1'])
    render(<ActionsSidebar />)

    fireEvent.click(screen.getByRole('button', { name: 'Discard All' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    })

    expect(actionsStore.getState().pendingSubmissions).toHaveLength(0)
  })

  // ─── "In review" section ──────────────────────────────────────────────────

  it('renders an "In review" section when myVoting has actions', () => {
    mockLiveActions.mockReturnValue({
      myVoting: [{ id: 'v1', action: ACTION_TYPES.REGISTER_POOL_CONFIG, status: 'voting', votesPos: ['me@mine.io'], params: [{ data: { poolConfigName: 'ReviewPool' } }] }],
      myReady: [],
      myExecuting: [],
      myDone: [],
      othersVoting: [],
      canApprove: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<ActionsSidebar />)

    expect(screen.getByText('In review')).toBeInTheDocument()
    expect(screen.getByText(/ADD POOL CONFIG: REVIEWPOOL/)).toBeInTheDocument()
    expect(screen.getByText('Action Submitted')).toBeInTheDocument()
  })

  it('renders a Cancel Request button on a voting action', () => {
    mockLiveActions.mockReturnValue({
      myVoting: [{ id: 'v2', action: ACTION_TYPES.REGISTER_POOL_CONFIG, status: 'voting', votesPos: ['me@mine.io'], params: [] }],
      myReady: [],
      myExecuting: [],
      myDone: [],
      othersVoting: [],
      canApprove: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<ActionsSidebar />)

    expect(screen.getByRole('button', { name: 'Cancel Request' })).toBeInTheDocument()
  })

  it('cancels the request and fires a success notification', async () => {
    mockLiveActions.mockReturnValue({
      myVoting: [{ id: 'v3', action: ACTION_TYPES.REGISTER_POOL_CONFIG, status: 'voting', votesPos: ['me@mine.io'], params: [] }],
      myReady: [],
      myExecuting: [],
      myDone: [],
      othersVoting: [],
      canApprove: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<ActionsSidebar />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel Request' }))
    })

    expect(mockCancel).toHaveBeenCalledWith({ ids: ['v3'], type: 'voting' })
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  // ─── "Requested" section ─────────────────────────────────────────────────

  it('renders a "Requested" section with Approve/Reject when othersVoting is non-empty and canApprove', () => {
    mockLiveActions.mockReturnValue({
      myVoting: [],
      myReady: [],
      myExecuting: [],
      myDone: [],
      othersVoting: [{ id: 'o1', action: ACTION_TYPES.SETUP_POOLS, status: 'voting', votesPos: ['other@mine.io'], query: { id: { $in: ['d1'] } }, params: [{ poolConfigId: 'p1', configType: 'pool' }] }],
      canApprove: true,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<ActionsSidebar />)

    expect(screen.getByText('Requested')).toBeInTheDocument()
    // Other users' actions display the submitter email (votesPos[0]).
    expect(screen.getByText('other@mine.io')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    // A requested card never offers Cancel Request (that's only for my own actions).
    expect(screen.queryByRole('button', { name: 'Cancel Request' })).not.toBeInTheDocument()
  })

  it('does NOT render the "Requested" section when canApprove is false', () => {
    mockLiveActions.mockReturnValue({
      myVoting: [],
      myReady: [],
      myExecuting: [],
      myDone: [],
      othersVoting: [{ id: 'o2', action: ACTION_TYPES.SETUP_POOLS, status: 'voting', votesPos: ['other@mine.io'], params: [] }],
      canApprove: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<ActionsSidebar />)

    expect(screen.queryByText('Requested')).not.toBeInTheDocument()
  })

  // ─── Pin / unpin ──────────────────────────────────────────────────────────

  it('adds the --pinned modifier class when the pin button is clicked', () => {
    render(<ActionsSidebar />)

    const pinBtn = screen.getByRole('button', { name: 'Pin sidebar' })
    fireEvent.click(pinBtn)

    expect(actionsStore.getState().sidebarPinned).toBe(true)
  })

  it('removes the --pinned modifier when the unpin button is clicked', () => {
    actionsStore.getState().setSidebarPinned(true)
    render(<ActionsSidebar />)

    const unpinBtn = screen.getByRole('button', { name: 'Unpin sidebar' })
    fireEvent.click(unpinBtn)

    expect(actionsStore.getState().sidebarPinned).toBe(false)
  })

  // ─── Open / close ─────────────────────────────────────────────────────────

  it('applies the --open class to the drawer when sidebarOpen is true', () => {
    actionsStore.getState().setSidebarOpen(true)
    const { container } = render(<ActionsSidebar />)

    expect(container.querySelector('.mdk-actions-sidebar--open')).toBeInTheDocument()
  })

  it('does not apply --open class when sidebarOpen is false', () => {
    actionsStore.getState().setSidebarOpen(false)
    const { container } = render(<ActionsSidebar />)

    expect(container.querySelector('.mdk-actions-sidebar--open')).not.toBeInTheDocument()
  })

  it('closes the sidebar when the close button is clicked', () => {
    actionsStore.getState().setSidebarOpen(true)
    render(<ActionsSidebar />)

    fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }))
    expect(actionsStore.getState().sidebarOpen).toBe(false)
  })
})
