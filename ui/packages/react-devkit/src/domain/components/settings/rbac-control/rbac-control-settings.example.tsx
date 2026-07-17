import { RBACControlSettings } from '@tetherto/mdk-react-devkit'

const mockRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
]

const mockUsers = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'operator' },
]

const mockPermissions = {
  admin: { read: 'full' as never, write: 'full' as never },
  operator: { read: 'full' as never, write: 'limited' as never },
  viewer: { read: 'full' as never, write: 'none' as never },
}

export const RBACControlSettingsExample = () => (
  <div className="mdk-example-row">
    <RBACControlSettings
      users={mockUsers as never}
      roles={mockRoles}
      rolePermissions={mockPermissions}
      permissionLabels={{ read: 'Read', write: 'Write' }}
      canWrite={true}
      onCreateUser={async () => {}}
      onUpdateUser={async () => {}}
      onDeleteUser={async () => {}}
    />
  </div>
)
