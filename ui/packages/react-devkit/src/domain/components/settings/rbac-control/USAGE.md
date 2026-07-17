# RBACControlSettings

Full role-based access control settings panel: user list with inline role editing, permission matrix, and invite/delete controls.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `users` | `SettingsUser[]` | yes | — | List of current users. |
| `roles` | `RoleOption[]` | yes | — | Available role options. |
| `rolePermissions` | `Record<string, Record<string, PermLevel>>` | yes | — | Permission levels per role. |
| `permissionLabels` | `Record<string, string>` | yes | — | Display labels for permission keys. |
| `canWrite` | `boolean` | yes | — | Whether the current user may edit access settings. |
| `isLoading` | `boolean` | no | — | Show loading state. |
| `onCreateUser` | `(data) => Promise<void>` | yes | — | Create a new user. |
| `onUpdateUser` | `(data) => Promise<void>` | yes | — | Update an existing user's role. |
| `onDeleteUser` | `(userId) => Promise<void>` | yes | — | Delete a user. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { RBACControlSettings } from "@tetherto/mdk-react-devkit";

<RBACControlSettings
  users={users}
  roles={roles}
  rolePermissions={rolePermissions}
  permissionLabels={permissionLabels}
  canWrite={true}
  onCreateUser={handleCreate}
  onUpdateUser={handleUpdate}
  onDeleteUser={handleDelete}
/>
```
