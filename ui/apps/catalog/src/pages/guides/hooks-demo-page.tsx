import type { JSX } from 'react'

import { Button } from '@tetherto/mdk-react-devkit/core'
import {
  useActions,
  useAuth,
  useDevices,
  useNotifications,
  useTimezone,
} from '@tetherto/mdk-react-adapter'

import { DemoBlock } from '../../components/demo-block'
import { DemoPageHeader } from '../../components/demo-page-header'

const AuthDemo = (): JSX.Element => {
  const { token, permissions, setToken, setPermissions, reset } = useAuth()
  return (
    <div>
      <p>
        <strong>token:</strong> <code>{token ?? '(null)'}</code>
      </p>
      <p>
        <strong>permissions:</strong>{' '}
        <code>{permissions ? JSON.stringify(permissions) : '(null)'}</code>
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button onClick={() => setToken(`tok_${Date.now()}`)}>Set token</Button>
        <Button onClick={() => setPermissions({ superAdmin: true, write: true })}>
          Set permissions
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  )
}

const NotificationsDemo = (): JSX.Element => {
  const { count, increment, decrement, reset } = useNotifications()
  return (
    <div>
      <p>
        <strong>count:</strong> <code>{count}</code>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={increment}>Increment</Button>
        <Button onClick={decrement}>Decrement</Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  )
}

const TimezoneDemo = (): JSX.Element => {
  const { timezone, setTimezone } = useTimezone()
  return (
    <div>
      <p>
        <strong>timezone:</strong> <code>{timezone}</code>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => setTimezone('UTC')}>UTC</Button>
        <Button onClick={() => setTimezone('America/New_York')}>America/New_York</Button>
        <Button onClick={() => setTimezone('Asia/Bangkok')}>Asia/Bangkok</Button>
      </div>
    </div>
  )
}

const DevicesDemo = (): JSX.Element => {
  const { selectedDevices, setSelectedDevices, setResetSelections } = useDevices()
  return (
    <div>
      <p>
        <strong>selectedDevices:</strong> <code>{selectedDevices.length}</code> selected
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          onClick={() =>
            setSelectedDevices([
              { id: 'm-1', code: 'M-01' },
              { id: 'm-2', code: 'M-02' },
              { id: 'm-3', code: 'M-03' },
            ] as never[])
          }
        >
          Select 3 miners
        </Button>
        <Button variant="secondary" onClick={() => setResetSelections()}>
          Reset
        </Button>
      </div>
    </div>
  )
}

const ActionsDemo = (): JSX.Element => {
  const { pendingSubmissions, setAddPendingSubmissionAction, clearAllPendingSubmissions } =
    useActions()
  return (
    <div>
      <p>
        <strong>pendingSubmissions:</strong> <code>{pendingSubmissions.length}</code> in queue
      </p>
      <ul style={{ maxHeight: 120, overflow: 'auto' }}>
        {pendingSubmissions.map((submission) => (
          <li key={submission.id}>
            <code>{submission.id}</code> —{' '}
            {(submission.action as string | undefined) ?? '(no action)'}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          onClick={() =>
            setAddPendingSubmissionAction({
              action: `demo:tick-${Date.now()}`,
              tags: ['demo'],
            })
          }
        >
          Enqueue submission
        </Button>
        <Button variant="secondary" onClick={() => clearAllPendingSubmissions()}>
          Clear all
        </Button>
      </div>
    </div>
  )
}

export const HooksDemoPage = (): JSX.Element => {
  return (
    <div>
      <DemoPageHeader
        title="Adapter Hooks"
        description="Live demonstration of the five MDK React adapter hooks. Each hook is backed by a Zustand vanilla store from @tetherto/mdk-ui-core and re-renders only when its selected slice changes."
      />

      <DemoBlock
        title="useAuth"
        description="Tracks API token and permissions for the current session."
      >
        <AuthDemo />
      </DemoBlock>

      <DemoBlock
        title="useNotifications"
        description="Unread notification counter, shared with toast utilities."
      >
        <NotificationsDemo />
      </DemoBlock>

      <DemoBlock
        title="useTimezone"
        description="Active timezone, with an override switch for user-local time."
      >
        <TimezoneDemo />
      </DemoBlock>

      <DemoBlock
        title="useDevices"
        description="Selected devices, containers and sockets across the explorer."
      >
        <DevicesDemo />
      </DemoBlock>

      <DemoBlock
        title="useActions"
        description="Queue of pending action submissions, e.g. miner controls and pool changes."
      >
        <ActionsDemo />
      </DemoBlock>
    </div>
  )
}
