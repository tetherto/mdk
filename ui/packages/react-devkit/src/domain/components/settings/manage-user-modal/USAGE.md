# `ManageUserModal`

Modal for editing an existing user's name, email, and role. Shows a role-permission matrix for context.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onClose` | Required | `VoidFunction` | - | Called when the dialog closes |
| `onSubmit` | Required | `(data: { id: string; name: string; email: string; role: string; }) => Promise<void>` | - | Save handler |
| `open` | Required | `boolean` | - | Controls dialog visibility |
| `permissionLabels` | Required | `Record<string, string>` | - | Display labels for permission keys |
| `rolePermissions` | Required | `Record<string, Record<string, PermLevel>>` | - | Permission levels per role |
| `roles` | Required | `RoleOption[]` | - | Available role options |
| `user` | Required | `SettingsUser` | - | The user being edited |
| `isSubmitting` | Optional | `boolean` | `false` | Show loading on submit button |
<!-- END GENERATED: props -->

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
