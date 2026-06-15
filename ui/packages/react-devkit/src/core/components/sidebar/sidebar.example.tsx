/**
 * Runnable example for Sidebar.
 */
import { useState } from 'react'
import { Sidebar } from '@tetherto/mdk-react-devkit'

const items = [
  { id: '/dashboard', label: 'Dashboard' },
  { id: '/alerts', label: 'Alerts' },
  { id: '/devices', label: 'Devices' },
  { id: '/settings', label: 'Settings' },
]

export const SidebarExample = () => {
  const [active, setActive] = useState('/dashboard')
  return (
    <Sidebar
      items={items}
      activeId={active}
      onItemClick={(item) => setActive(item.id)}
      defaultExpanded
    />
  )
}
