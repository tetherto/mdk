# `RBACControlSettings`

Full role-based access control settings panel: user list with inline role editing, permission matrix, and invite/delete controls.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `canWrite` | Required | `boolean` | - | Whether the current user may edit access settings |
| `onCreateUser` | Required | `(data: { name: string; email: string; role: string; }) => Promise<void>` | - | Create a new user |
| `onDeleteUser` | Required | `(userId: string) => Promise<void>` | - | Delete a user |
| `onUpdateUser` | Required | `(data: { id: string; name: string; email: string; role: string; }) => Promise<void>` | - | Update an existing user's role |
| `permissionLabels` | Required | `Record<string, string>` | - | Display labels for permission keys |
| `rolePermissions` | Required | `Record<string, Record<string, PermLevel>>` | - | Permission levels per role |
| `roles` | Required | `RoleOption[]` | - | Available role options |
| `users` | Required | `SettingsUser[]` | - | List of current users |
| `className` | Optional | `string` | - | Additional CSS class |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
<!-- END GENERATED: props -->

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
