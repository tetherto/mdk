# @mdk/fonts

Font assets for MDK.

## Installation

```bash
pnpm add @mdk/fonts
```

## Usage

Import the font CSS in your application entry point:

```typescript
import '@mdk/fonts/jetbrains-mono.css'
```

This will:
1. Load JetBrains Mono font family (weights: 100, 300, 400, 500, 600, 700)
2. Override the `--font-mono` CSS variable to use JetBrains Mono

## What's Included

- **JetBrainsMono-Thin.woff2** (88 KB) - Font weight 100
- **JetBrainsMono-Light.woff2** (92 KB) - Font weight 300
- **JetBrainsMono-Regular.woff2** (90 KB) - Font weight 400
- **JetBrainsMono-Medium.woff2** (92 KB) - Font weight 500
- **JetBrainsMono-SemiBold.woff2** (92 KB) - Font weight 600
- **JetBrainsMono-Bold.woff2** (92 KB) - Font weight 700

**Total size:** 564 KB (all fonts) | 1 KB (CSS only, gzips to 270 bytes)

## Optional

This package is **optional**. If you don't import it, `@mdk/core` will fall back to system monospace fonts.

## For Demo Apps

If you're building a demo/documentation app, copy the fonts to your public folder:

```bash
cp -r packages/fonts/public/fonts apps/your-app/public/
```

Then import the CSS as shown above.
