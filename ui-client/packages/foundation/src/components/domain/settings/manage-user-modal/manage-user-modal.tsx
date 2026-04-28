import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogContent, DialogFooter, Form, FormInput, FormSelect } from '@tetherto/core'

import { PERM_LEVEL_LABELS } from '../../../../constants/settings.constants'
import type { PermLevel, RoleOption, SettingsUser } from '../../../../types/settings.types'

import './manage-user-modal.scss'
import { WEBAPP_SHORT_NAME } from '../../../../constants'

const manageUserSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('This should be a valid email').min(1, 'Email is required').trim(),
  role: z.string().min(1, 'Role is required'),
})

type ManageUserFormValues = z.infer<typeof manageUserSchema>

export type ManageUserModalProps = {
  open: boolean
  onClose: VoidFunction
  user: SettingsUser
  roles: RoleOption[]
  rolePermissions: Record<string, Record<string, PermLevel>>
  permissionLabels: Record<string, string>
  onSubmit: (data: { id: string; name: string; email: string; role: string }) => Promise<void>
  isSubmitting?: boolean
}

const PermissionIcon = ({ level }: { level: PermLevel }) => {
  if (level === 'rw') {
    return (
      <span className="mdk-settings-manage-user__perm-icon mdk-settings-manage-user__perm-icon--rw">
        {PERM_LEVEL_LABELS.rw}
      </span>
    )
  }
  if (level === 'r') {
    return (
      <span className="mdk-settings-manage-user__perm-icon mdk-settings-manage-user__perm-icon--r">
        {PERM_LEVEL_LABELS.r}
      </span>
    )
  }
  return (
    <span className="mdk-settings-manage-user__perm-icon mdk-settings-manage-user__perm-icon--none">
      {PERM_LEVEL_LABELS.none}
    </span>
  )
}

export const ManageUserModal = ({
  open,
  onClose,
  user,
  roles,
  rolePermissions,
  permissionLabels,
  onSubmit,
  isSubmitting = false,
}: ManageUserModalProps) => {
  const [selectedRole, setSelectedRole] = useState(user.role)

  const form = useForm<ManageUserFormValues>({
    resolver: zodResolver(manageUserSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email,
      role: user.role,
    },
    mode: 'onSubmit',
  })

  useEffect(() => {
    form.reset({
      name: user.name || '',
      email: user.email,
      role: user.role,
    })
    setSelectedRole(user.role)
  }, [user, form])

  const watchedRole = form.watch('role')
  useEffect(() => {
    setSelectedRole(watchedRole)
  }, [watchedRole])

  const rolePerms = rolePermissions[selectedRole] || {}
  const permissionKeys = Object.keys(permissionLabels)

  const handleSubmit = async (values: ManageUserFormValues) => {
    await onSubmit({
      id: user.id,
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        title="Manage User"
        closable
        onClose={onClose}
        closeOnClickOutside
        className="mdk-settings-manage-user__dialog"
      >
        <Form
          form={form}
          className="mdk-settings-manage-user__form"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="mdk-settings-manage-user__section">
            <h4 className="mdk-settings-manage-user__section-title">User Information</h4>
            <p className="mdk-settings-manage-user__section-desc">Edit the user's basic details.</p>
            <FormInput
              control={form.control}
              name="name"
              label="Name"
              placeholder="Enter full name"
            />
            <FormInput
              control={form.control}
              name="email"
              label="Email"
              type="email"
              placeholder="Enter email address"
            />
            <p className="mdk-settings-manage-user__helper">
              Changes to name or email are saved along with the selected role.
            </p>
          </div>

          <div className="mdk-settings-manage-user__section">
            <h4 className="mdk-settings-manage-user__section-title">Assigned Role</h4>
            <p className="mdk-settings-manage-user__section-desc">
              Select the user's access level within {WEBAPP_SHORT_NAME}.
            </p>
            <FormSelect
              control={form.control}
              name="role"
              label="Role"
              placeholder="Select role"
              options={roles.map((r) => ({ value: r.value, label: r.label }))}
              description="The permissions summary below updates automatically when changing this selection."
            />
          </div>

          <div className="mdk-settings-manage-user__section">
            <h4 className="mdk-settings-manage-user__section-title">Effective Permissions</h4>
            <p className="mdk-settings-manage-user__section-desc">
              The actions available to this user as a{' '}
              {roles.find((r) => r.value === selectedRole)?.label || selectedRole}.
            </p>
            <div className="mdk-settings-manage-user__perms-table">
              <div className="mdk-settings-manage-user__perms-header">
                <div className="mdk-settings-manage-user__perms-cell--flex">Permission</div>
                <div className="mdk-settings-manage-user__perms-cell--fixed">Access Level</div>
              </div>
              {permissionKeys.map((key) => (
                <div key={key} className="mdk-settings-manage-user__perms-row">
                  <div className="mdk-settings-manage-user__perms-cell--flex">
                    {permissionLabels[key]}
                  </div>
                  <div className="mdk-settings-manage-user__perms-cell--fixed">
                    <PermissionIcon level={rolePerms[key] ?? false} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
