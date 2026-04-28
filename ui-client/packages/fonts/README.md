# @tetherto/fonts

Font assets for MDK (JetBrains Mono).

## Installation

```bash
pnpm add @tetherto/fonts
```

## Usage

Import the font CSS once in your application entry point:

```typescript
import '@tetherto/fonts/jetbrains-mono.css'
```

This is all you need. The CSS file references the woff2 assets via relative
URLs (`./fonts/*.woff2`), and your bundler (Vite, webpack, Rollup, etc.) will
automatically resolve, hash, and emit them alongside your other build assets —
no manual copy step required.

After importing, the package will:

1. Register the JetBrains Mono font family for weights 100, 300, 400, 500, 600, 700.
2. Override the `--font-mono` CSS variable so `@tetherto/core` components pick it up.

## What's Included

- **JetBrainsMono-Thin.woff2** - Font weight 100
- **JetBrainsMono-Light.woff2** - Font weight 300
- **JetBrainsMono-Regular.woff2** - Font weight 400
- **JetBrainsMono-Medium.woff2** - Font weight 500
- **JetBrainsMono-SemiBold.woff2** - Font weight 600
- **JetBrainsMono-Bold.woff2** - Font weight 700

## Optional

This package is **optional**. If you do not import it, `@tetherto/core` falls back
to the system monospace font stack defined on `--font-mono`.

## Direct asset access

If you need to reference an individual font file directly (for example, to
add a `<link rel="preload">` hint), the woff2 files are also exported:

```typescript
import jetBrainsRegular from '@tetherto/fonts/fonts/JetBrainsMono-Regular.woff2'
```
