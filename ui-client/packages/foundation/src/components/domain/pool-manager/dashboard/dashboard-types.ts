import type { ReactNode } from 'react'

export type NavigationBlockItem = {
  icon: ReactNode
  title: string
  description: string
  navText: string
  url: string
}

export type StatItemType = 'ERROR' | 'SUCCESS'

type StatItem = {
  label: string
  value: number
  type?: StatItemType
  secondaryValue?: string
}

export type DashboardStats = {
  items: StatItem[]
}
