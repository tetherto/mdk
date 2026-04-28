# @tetherto/core - Usage Guide

## Quick Start

### 1. Add to Your App

In your app's `package.json`, add the dependency:

```json
{
  "dependencies": {
    "@tetherto/core": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

Then run:

```bash
pnpm install
```

### 2. Import Styles

In your app's entry point (e.g., `main.tsx` or `App.tsx`), import the base styles:

```tsx
import '@tetherto/core/styles.css'
```

### 3. Use Components

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tetherto/core'

const MyComponent = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hello World</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
```

## Component Examples

### Button

```tsx
import { Button } from '@tetherto/core'
import { PlusIcon } from '@radix-ui/react-icons'

// Variants (default: secondary)
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Danger</Button>
<Button variant="tertiary">Tertiary</Button>
<Button variant="link">Link</Button>
<Button variant="icon" icon={<PlusIcon />} />

// With icon
<Button variant="primary" icon={<PlusIcon />} iconPosition="left">
  Add Item
</Button>
<Button variant="secondary" icon={<PlusIcon />} iconPosition="right">
  Add Item
</Button>

// Loading state
<Button variant="primary" loading>
  Submit
</Button>

// Full width
<Button variant="primary" fullWidth>
  Full Width Button
</Button>

// Customization (className on root, contentClassName on inner content)
<Button className="my-button" contentClassName="my-content">
  Custom Styled
</Button>
```

**Button props:**

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'tertiary' \| 'link' \| 'icon'` | Visual style (default: `secondary`) |
| `icon` | `ReactNode` | Icon element |
| `iconPosition` | `'left' \| 'right'` | Icon placement (default: `left`) |
| `loading` | `boolean` | Shows spinner, disables button |
| `fullWidth` | `boolean` | Stretches to container width |
| `className` | `string` | Root button element |
| `contentClassName` | `string` | Inner content wrapper |
| `disabled` | `boolean` | Disabled state |

Also accepts standard `<button>` HTML attributes. **No `size` prop.**

### Checkbox

```tsx
import { Checkbox, Label } from '@tetherto/core'
import { useState } from 'react'

const CheckboxDemo = () => {
  const [checked, setChecked] = useState(false)

  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  )
}
```

### Switch

```tsx
import { Label, Switch } from '@tetherto/core'
import { useState } from 'react'

const SwitchDemo = () => {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" checked={enabled} onCheckedChange={setEnabled} />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  )
}
```

### Accordion

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tetherto/core'

const AccordionDemo = () => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles that can be customized.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
```

### Avatar

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@tetherto/core'

const AvatarDemo = () => {
  return (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
```

### Alert Dialog

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@tetherto/core'

const AlertDialogDemo = () => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Radix Primitives (Namespaced)

For components that are re-exported as Radix primitives, use the namespace:

```tsx
import { DropdownMenu, Popover, Select, Tabs, Toast, Tooltip } from '@tetherto/core'

// Dropdown Menu
<DropdownMenu.Root>
  <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item>Item 1</DropdownMenu.Item>
    <DropdownMenu.Item>Item 2</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

// Tooltip
<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>Hover me</Tooltip.Trigger>
    <Tooltip.Content>
      <p>Tooltip content</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
```

## Styling

### CSS Variables

The components use CSS variables for theming. Customize them in your global CSS:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

### Custom Classes

All components accept a `className` prop. Button also supports `contentClassName` for the inner content wrapper:

```tsx
<Button className="my-custom-class">Custom Button</Button>
<Button contentClassName="my-content-class">Custom Content</Button>
```

### Button CSS Variables

Override typography per button via CSS variables:

```css
.my-button {
  --button-font-size: 12px;
  --button-font-weight: 700;
}
```

## TypeScript

All components are fully typed. Import types as needed:

```tsx
import type { ButtonProps } from '@tetherto/core'

const MyButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />
}
```

## Utilities

### cn() Helper

The `cn()` utility merges class names:

```tsx
import { cn } from '@tetherto/core'

const className = cn('base-class', condition && 'conditional-class', { 'object-class': true })
```

## Best Practices

1. **Import only what you need** - Tree-shaking will remove unused components
2. **Use TypeScript** - Full type safety is provided
3. **Customize with CSS variables** - Don't override component styles directly
4. **Compose components** - Build complex UIs from simple primitives
5. **Follow accessibility guidelines** - Components are accessible by default, maintain this

## Troubleshooting

### Styles not applying

Make sure you've imported the styles:

```tsx
import '@tetherto/core/styles.css'
```

### Type errors

Ensure you have the correct peer dependencies installed:

```bash
pnpm add react@^18.0.0 react-dom@^18.0.0
```

### Build errors

Run type checking to identify issues:

```bash
pnpm --filter @tetherto/core typecheck
```
