import type { ReactNode } from 'react'

import { Typography } from '@tetherto/core'

type DemoBlockProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export const DemoBlock = ({ title, description, children, className }: DemoBlockProps) => (
  <div className={className ?? 'line-chart-page__section'}>
    <Typography variant="heading3">{title}</Typography>
    {description && <Typography variant="secondary">{description}</Typography>}
    <div className="line-chart-page__card">{children}</div>
  </div>
)
