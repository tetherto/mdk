import { useState } from 'react'
import { ManageUserModal } from '@tetherto/mdk-react-devkit'

const mockRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
]

const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' }

export const ManageUserModalExample = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mdk-example-row">
      <button onClick={() => setOpen(true)}>Manage User</button>
      <ManageUserModal
        open={open}
        onClose={() => setOpen(false)}
        user={mockUser as never}
        roles={mockRoles}
        rolePermissions={{
          admin: { read: 'full' as never },
          operator: { read: 'limited' as never },
        }}
        permissionLabels={{ read: 'Read Access' }}
        onSubmit={async () => setOpen(false)}
      />
    </div>
  )
}
