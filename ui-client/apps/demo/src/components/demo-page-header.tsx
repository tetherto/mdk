import type { ReactNode } from 'react'

import { Typography } from '@tetherto/core'

import './demo-page-header.scss'

type DemoPageHeaderProps = {
  title: string
  description?: ReactNode
  className?: string
}

/**
 * Unified page-level header for demo routes.
 *
 * Renders a consistent title (h2) and optional description so every demo
 * page has matching visual hierarchy. Use this at the top of each routed
 * demo page instead of hand-rolling `<h1>`/`<Typography heading1>` + `<p>`.
 */
export const DemoPageHeader = ({
  title,
  description,
  className,
}: DemoPageHeaderProps): JSX.Element => (
  <header className={['demo-page-header', className].filter(Boolean).join(' ')}>
    <Typography variant="heading2" className="demo-page-header__title">
      {title}
    </Typography>
    {description ? (
      <Typography variant="secondary" className="demo-page-header__description">
        {description}
      </Typography>
    ) : null}
  </header>
)
