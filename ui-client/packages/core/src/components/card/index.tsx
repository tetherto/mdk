import * as React from 'react'

import { cn } from '../../utils'

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>

export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mdk-card__header', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mdk-card__body', className)} {...props} />
))
CardBody.displayName = 'CardBody'

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mdk-card__footer', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

/**
 * Groups children into header, body, and footer slots.
 * CardHeader/CardBody/CardFooter go to their slots; all others go to body.
 */
function partitionChildren(children: React.ReactNode): {
  header: React.ReactNode
  body: React.ReactNode
  footer: React.ReactNode
} {
  const header: React.ReactNode[] = []
  const body: React.ReactNode[] = []
  const footer: React.ReactNode[] = []

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type != null && typeof child.type !== 'string') {
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
const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const { header, body, footer } = partitionChildren(children)

    const bodyArray = body ? (Array.isArray(body) ? body : [body]) : []
    const hasCardBody = bodyArray.some(
      (item) =>
        React.isValidElement(item) &&
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

export type CardComponent = React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
> & {
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
