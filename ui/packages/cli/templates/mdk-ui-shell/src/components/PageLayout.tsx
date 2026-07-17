import type { ReactNode } from 'react'

export type PageLayoutProps = {
  /** Page heading, shown in the unified header row. */
  title: string
  /** Optional header controls (filters, export, view switches) shown opposite the title. */
  actions?: ReactNode
  /** Page content. */
  children: ReactNode
  /** Extra class on the page root (content-specific layout tweaks). */
  className?: string
}

/**
 * The one page shell every route renders inside, so every page's header sits at
 * the same height with the same title style. Owns the page heading; feature
 * components should not render their own page-level title.
 */
export const PageLayout = ({ title, actions, children, className }: PageLayoutProps) => (
  <div className={`mdk-ui-shell-page${className ? ` ${className}` : ''}`}>
    <header className="mdk-ui-shell-page__header">
      <h1 className="mdk-ui-shell-page__title">{title}</h1>
      {actions && <div className="mdk-ui-shell-page__actions">{actions}</div>}
    </header>
    {children}
  </div>
)
