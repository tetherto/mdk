import { useMemo, useState } from 'react'
import { Button, Input, SimpleTooltip, Spinner } from '@mdk/core'

import type { PermLevel, RoleOption, SettingsUser } from '../../../../types/settings.types'
import { getRoleBadgeColors } from '../../../../constants/role-colors.constants'
import { formatLastActive, formatRoleLabel } from '../../../../utils/settings-utils'
import { AddUserModal } from '../add-user-modal'
import { ChangeConfirmationModal } from '../change-confirmation-modal'
import { ManageUserModal } from '../manage-user-modal'

import './rbac-control-settings.scss'

export type RBACControlSettingsProps = {
  users: SettingsUser[]
  roles: RoleOption[]
  rolePermissions: Record<string, Record<string, PermLevel>>
  permissionLabels: Record<string, string>
  canWrite: boolean
  isLoading?: boolean
  onCreateUser: (data: { name: string; email: string; role: string }) => Promise<void>
  onUpdateUser: (data: { id: string; name: string; email: string; role: string }) => Promise<void>
  onDeleteUser: (userId: string) => Promise<void>
  className?: string
}

export const RBACControlSettings = ({
  users,
  roles,
  rolePermissions,
  permissionLabels,
  canWrite,
  isLoading = false,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  className,
}: RBACControlSettingsProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [manageUser, setManageUser] = useState<SettingsUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<SettingsUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
          user.name?.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
        )
      }),
    [users, searchQuery],
  )

  const handleCreateUser = async (data: { name: string; email: string; role: string }) => {
    setIsSubmitting(true)
    try {
      await onCreateUser(data)
      setAddModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async (data: {
    id: string
    name: string
    email: string
    role: string
  }) => {
    setIsSubmitting(true)
    try {
      await onUpdateUser(data)
      setManageUser(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return
    await onDeleteUser(deleteUser.id)
    setDeleteUser(null)
  }

  if (isLoading) return <Spinner />

  return (
    <div className={`mdk-settings-rbac ${className || ''}`}>
      <p className="mdk-settings-rbac__description">Manage user access across the organization</p>

      <div className="mdk-settings-rbac__actions-row">
        <div className="mdk-settings-rbac__search">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="search"
          />
        </div>
        {canWrite && (
          <Button variant="primary" onClick={() => setAddModalOpen(true)}>
            Add User
          </Button>
        )}
      </div>

      <div className="mdk-settings-rbac__table">
        <div className="mdk-settings-rbac__table-header">
          <div className="mdk-settings-rbac__table-header-row">
            <div className="mdk-settings-rbac__table-header-cell">User</div>
            <div className="mdk-settings-rbac__table-header-cell">Email</div>
            <div className="mdk-settings-rbac__table-header-cell">Assigned Roles</div>
            <div className="mdk-settings-rbac__table-header-cell">Last Active</div>
            <div className="mdk-settings-rbac__table-header-cell mdk-settings-rbac__table-header-cell--center">
              Manage
            </div>
            <div className="mdk-settings-rbac__table-header-cell mdk-settings-rbac__table-header-cell--right">
              Delete
            </div>
          </div>
        </div>
        <div className="mdk-settings-rbac__table-body">
          {filteredUsers.map((user) => {
            const { color, bgColor } = getRoleBadgeColors(user.role)
            return (
              <div key={user.id} className="mdk-settings-rbac__table-row">
                <SimpleTooltip content={user.name || 'N/A'}>
                  <div className="mdk-settings-rbac__table-cell">{user.name || 'N/A'}</div>
                </SimpleTooltip>
                <SimpleTooltip content={user.email}>
                  <div className="mdk-settings-rbac__table-cell">{user.email}</div>
                </SimpleTooltip>
                <div className="mdk-settings-rbac__table-cell">
                  <span
                    className="mdk-settings-rbac__role-badge"
                    style={{ color, backgroundColor: bgColor }}
                  >
                    {formatRoleLabel(user.role)}
                  </span>
                </div>
                <div className="mdk-settings-rbac__table-cell">
                  {formatLastActive(user.lastActive || user.last_login || undefined)}
                </div>
                <div className="mdk-settings-rbac__table-cell mdk-settings-rbac__table-cell--center">
                  {canWrite && (
                    <button
                      type="button"
                      className="mdk-settings-rbac__manage-btn"
                      onClick={() => setManageUser(user)}
                    >
                      Manage User
                    </button>
                  )}
                </div>
                <div className="mdk-settings-rbac__table-cell mdk-settings-rbac__table-cell--right">
                  {canWrite && (
                    <button
                      type="button"
                      className="mdk-settings-rbac__delete-btn"
                      onClick={() => setDeleteUser(user)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {addModalOpen && (
        <AddUserModal
          open
          onClose={() => setAddModalOpen(false)}
          roles={roles}
          onSubmit={handleCreateUser}
          isSubmitting={isSubmitting}
        />
      )}

      {manageUser && (
        <ManageUserModal
          open
          onClose={() => setManageUser(null)}
          user={manageUser}
          roles={roles}
          rolePermissions={rolePermissions}
          permissionLabels={permissionLabels}
          onSubmit={handleUpdateUser}
          isSubmitting={isSubmitting}
        />
      )}

      {deleteUser && (
        <ChangeConfirmationModal
          open
          title={`Delete ${deleteUser.email}?`}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDeleteConfirm}
          confirmText="Delete"
          destructive
        >
          Are you sure you want to delete this user? This action is permanent and cannot be undone.
        </ChangeConfirmationModal>
      )}
    </div>
  )
}
