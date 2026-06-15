# @tetherto/mdk-fonts

Font assets for MDK (JetBrains Mono).

## Installation

```bash
npm install @tetherto/mdk-fonts
```

## Usage

Import the font CSS once in your application entry point:

```typescript
import "@tetherto/mdk-fonts/jetbrains-mono.css"
```

This is all you need. The CSS file references the woff2 assets via relative
URLs (`./fonts/*.woff2`), and your bundler (Vite, webpack, Rollup, etc.) will
automatically resolve, hash, and emit them alongside your other build assets —
no manual copy step required.

After importing, the package will:

1. Register the JetBrains Mono font family for weights 100, 300, 400, 500, 600, 700.
2. Override the `--font-mono` CSS variable so `@tetherto/mdk-react-devkit` components pick it up.

## What's included

- **JetBrainsMono-Thin.woff2** — font weight 100
- **JetBrainsMono-Light.woff2** — font weight 300
- **JetBrainsMono-Regular.woff2** — font weight 400
- **JetBrainsMono-Medium.woff2** — font weight 500
- **JetBrainsMono-SemiBold.woff2** — font weight 600
- **JetBrainsMono-Bold.woff2** — font weight 700

## Optional

This package is **optional**. If you do not import it, `@tetherto/mdk-react-devkit`
falls back to the system monospace font stack defined on `--font-mono`.

## Direct asset access

If you need to reference an individual font file directly (for example, to
add a `<link rel="preload">` hint), the woff2 files are also exported:

```typescript
import jetBrainsRegular from "@tetherto/mdk-fonts/fonts/JetBrainsMono-Regular.woff2"
```
