# Card

Layout card with optional `Card.Header`, `Card.Body`, and `Card.Footer` slots.
Default children go to body. Forwards all native `<div>` attributes; pass
`onClick` to make the whole card clickable.

## Slots

```tsx
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

`CardProps`, `CardHeaderProps`, `CardBodyProps`, `CardFooterProps` are all
`HTMLAttributes<HTMLDivElement>`.

## Example

```tsx
<Card onClick={() => navigate("/details")}>
  <Card.Header>Title</Card.Header>
  Content (default children go to body)
</Card>
```
