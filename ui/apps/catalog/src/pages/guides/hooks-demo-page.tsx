import type { JSX } from 'react'

import { Button } from '@tetherto/mdk-react-devkit/primitives'
import { useAuth, useDevices, useNotifications, useTimezone } from '@tetherto/mdk-react-adapter'

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
      <div className="demo-section__button-row">
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
      <div className="demo-section__button-row">
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
      <div className="demo-section__button-row">
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
      <div className="demo-section__button-row">
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

export const HooksDemoPage = (): JSX.Element => {
  return (
    <div>
      <DemoPageHeader
        title="Adapter Hooks"
        description="Live demonstration of the four MDK React adapter store hooks. Each hook is backed by a Zustand vanilla store from @tetherto/mdk-ui-foundation and re-renders only when its selected slice changes."
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
    </div>
  )
}
