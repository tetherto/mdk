import {
  Children,
  forwardRef,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type RefAttributes,
} from 'react'
import { cn } from '../../utils'

/** Props for {@link Card}. Forwards all native `<div>` attributes. */
export type CardProps = HTMLAttributes<HTMLDivElement>

/** Props for {@link CardHeader} slot. Forwards all native `<div>` attributes. */
export type CardHeaderProps = HTMLAttributes<HTMLDivElement>

/** Props for {@link CardBody} slot. Forwards all native `<div>` attributes. */
export type CardBodyProps = HTMLAttributes<HTMLDivElement>

/** Props for {@link CardFooter} slot. Forwards all native `<div>` attributes. */
export type CardFooterProps = HTMLAttributes<HTMLDivElement>

/**
 * Top region of a `<Card>` that groups the title, optional subtitle, and an action slot.
 *
 * @category layout
 * @domain generic
 * @tier agent-ready
 */
const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mdk-card__header', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

/**
 * Main content region of a `<Card>` — applies the standard inner padding and vertical rhythm.
 *
 * @category layout
 * @domain generic
 * @tier agent-ready
 */
const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mdk-card__body', className)} {...props} />
))
CardBody.displayName = 'CardBody'

/**
 * Bottom action/metadata row of a `<Card>`, typically used for buttons, timestamps, or secondary info.
 *
 * @category layout
 * @domain generic
 * @tier agent-ready
 */
const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mdk-card__footer', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

/**
 * Groups children into header, body, and footer slots.
 * CardHeader/CardBody/CardFooter go to their slots; all others go to body.
 */
const partitionChildren = (
  children: ReactNode,
): {
  header: ReactNode
  body: ReactNode
  footer: ReactNode
} => {
  const header: ReactNode[] = []
  const body: ReactNode[] = []
  const footer: ReactNode[] = []

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type != null && typeof child.type !== 'string') {
      const displayName = (child.type as { displayName?: string }).displayName
      if (displayName === 'CardHeader') header.push(child)
      else if (displayName === 'CardBody') body.push(child)
      else if (displayName === 'CardFooter') footer.push(child)
      else body.push(child)
    } else {
      body.push(child)
    }
  })

  return {
    header: header.length > 0 ? header : null,
    body: body.length > 0 ? body : null,
    footer: footer.length > 0 ? footer : null,
  }
}

/**
 * Card component with optional header, body, and footer.
 * Default children are rendered in the body.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 *   <Card.Footer>Actions</Card.Footer>
 * </Card>
 * ```
 *
 * @example
 * ```tsx
 * <Card>
 *   <Card.Header>Title</Card.Header>
 *   Content (default children go to body)
 * </Card>
 * ```
 *
 * @example
 * ```tsx
 * <Card onClick={() => navigate('/details')}>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 * </Card>
 * ```
 */
const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const { header, body, footer } = partitionChildren(children)

    const bodyArray = body ? (Array.isArray(body) ? body : [body]) : []
    const hasCardBody = bodyArray.some(
      (item) =>
        isValidElement(item) &&
        item.type != null &&
        (item.type as { displayName?: string }).displayName === 'CardBody',
    )
    const bodyContent = body && (hasCardBody ? body : <div className="mdk-card__body">{body}</div>)

    return (
      <div
        ref={ref}
        className={cn('mdk-card', onClick && 'mdk-card--clickable', className)}
        onClick={onClick}
        {...props}
      >
        {header}
        {bodyContent}
        {footer}
      </div>
    )
  },
)
CardRoot.displayName = 'Card'

export type CardComponent = ForwardRefExoticComponent<CardProps & RefAttributes<HTMLDivElement>> & {
  Header: typeof CardHeader
  Body: typeof CardBody
  Footer: typeof CardFooter
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
}) as CardComponent
export { CardBody, CardFooter, CardHeader }
