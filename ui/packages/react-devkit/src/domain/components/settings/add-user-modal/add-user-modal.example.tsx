/**
 * Runnable example for AddUserModal.
 */
import { AddUserModal } from '@tetherto/mdk-react-devkit'

const mockRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
]

export const AddUserModalExample = () => (
  <div className="mdk-example-row">
    <AddUserModal
      open={true}
      onClose={() => {
        console.warn('modal closed')
      }}
      roles={mockRoles}
      onSubmit={async (data) => {
        console.warn('create user', data)
      }}
    />
  </div>
)
