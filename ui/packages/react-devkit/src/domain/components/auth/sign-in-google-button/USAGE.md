# SignInGoogleButton

Single-button Google OAuth sign-in trigger. Defaults to a full-page redirect
to `${oauthBaseUrl}/oauth/google`. The backend issues a JWT and redirects
back with `?authToken=…`, which `useAuthToken` then persists into the
session store.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `oauthBaseUrl` | Required | `string` | - | Base URL of the OAuth backend (no trailing slash). Click navigates to `${oauthBaseUrl}/oauth/google` |
| `contentClassName` | Optional | `string` | - | Class names applied to the inner content wrapper |
| `disabled` | Optional | `boolean` | `false` | Disable the button |
| `fullWidth` | Optional | `boolean` | `false` | Make the button stretch to fill its container |
| `icon` | Optional | `React.ReactNode` | - | Icon node rendered alongside `children` |
| `iconPosition` | Optional | `"left" \| "right"` | `"left"` | Icon placement relative to children |
| `label` | Optional | `string` | `"Sign in with Google"` | Override the visible button label |
| `loading` | Optional | `boolean` | `false` | Show a spinner instead of the content and disable the button |
| `onClick` | Optional | `(() => void)` | `redirect` | Override the click behaviour entirely. When set, `oauthBaseUrl` is ignored |
| `size` | Optional | `"sm" \| "md" \| "lg"` | - | Size token (`sm`, `md`, `lg`) |
| `type` | Optional | `"button" \| "submit" \| "reset"` | `"button"` | Native button type |
| `variant` | Optional | `"icon" \| "link" \| "primary" \| "danger" \| "secondary" \| "tertiary" \| "nav-link" \| "outline" \| "ghost"` | `"secondary"` | Visual variant (e.g. `primary`, `secondary`, `ghost`) |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

| Prop           | Status   | Type          | Default | Description                            |
| -------------- | -------- | ------------- | ------- | -------------------------------------- |
| ...rest        | Optional | `ButtonProps` | —       | Forwarded to the underlying `<Button>` |

## Example

```tsx
<SignInGoogleButton oauthBaseUrl={import.meta.env.VITE_OAUTH_BASE_URL} />
```

## Notes

- Uses `window.location.href` (full-page navigation) rather than client-side
  routing so the OAuth callback URL is treated as an external load
- The backend side is an identity plugin you supply — MDK ships no OAuth
  implementation. It serves the `/oauth/google` start endpoint this button
  navigates to, and redirects back to the frontend with `?authToken=<jwt>`.
  For local dev that is typically a callback of
  `http://localhost:3000/oauth/google/callback` returning to
  `http://localhost:3030`.
