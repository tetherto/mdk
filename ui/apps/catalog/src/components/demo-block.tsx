import type { ReactNode } from 'react'

import { Typography } from '@tetherto/mdk-react-devkit/primitives'

import './demo-block.scss'

type DemoBlockProps = {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

export const DemoBlock = ({ title, description, children, className }: DemoBlockProps) => (
  <div className={['demo-block', className].filter(Boolean).join(' ')}>
    <Typography variant="heading3" className="demo-block__title">
      {title}
    </Typography>
    {description && (
      <Typography variant="secondary" className="demo-block__description">
        {description}
      </Typography>
    )}
    <div className="demo-block__body">{children}</div>
  </div>
)
