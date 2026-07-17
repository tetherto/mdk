# ManageUserModal

Modal for editing an existing user's name, email, and role. Shows a role-permission matrix for context.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | yes | — | Controls dialog visibility. |
| `onClose` | `VoidFunction` | yes | — | Called when the dialog closes. |
| `user` | `SettingsUser` | yes | — | The user being edited. |
| `roles` | `RoleOption[]` | yes | — | Available role options. |
| `rolePermissions` | `Record<string, Record<string, PermLevel>>` | yes | — | Permission levels per role. |
| `permissionLabels` | `Record<string, string>` | yes | — | Display labels for permission keys. |
| `onSubmit` | `(data) => Promise<void>` | yes | — | Save handler. |
| `isSubmitting` | `boolean` | no | — | Show loading on submit button. |

## Minimal example

```tsx
import { ManageUserModal } from "@tetherto/mdk-react-devkit";

<ManageUserModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  user={selectedUser}
  roles={roles}
  rolePermissions={rolePermissions}
  permissionLabels={permissionLabels}
  onSubmit={handleUpdate}
/>
```
