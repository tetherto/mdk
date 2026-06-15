import { describe, expect, it } from 'vitest'

import { getFirstLeaf, hasActiveDescendant } from '../helpers'
import type { SidebarMenuItem } from '../types'

describe('hasActiveDescendant', () => {
  it('returns true when item id matches activeId', () => {
    const item: SidebarMenuItem = {
      id: 'dashboard',
      label: 'Dashboard',
      url: '/dashboard',
    }

    expect(hasActiveDescendant(item, 'dashboard')).toBe(true)
  })

  it('returns false when item id does not match and no children', () => {
    const item: SidebarMenuItem = {
      id: 'dashboard',
      label: 'Dashboard',
      url: '/dashboard',
    }

    expect(hasActiveDescendant(item, 'settings')).toBe(false)
  })

  it('returns true when child item matches activeId', () => {
    const item: SidebarMenuItem = {
      id: 'devices',
      label: 'Devices',
      items: [
        {
          id: 'miners',
          label: 'Miners',
          url: '/devices/miners',
        },
        {
          id: 'containers',
          label: 'Containers',
          url: '/devices/containers',
        },
      ],
    }

    expect(hasActiveDescendant(item, 'miners')).toBe(true)
  })

  it('returns true when deeply nested child matches activeId', () => {
    const item: SidebarMenuItem = {
      id: 'admin',
      label: 'Admin',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          items: [
            {
              id: 'users',
              label: 'Users',
              url: '/admin/settings/users',
            },
          ],
        },
      ],
    }

    expect(hasActiveDescendant(item, 'users')).toBe(true)
  })

  it('returns false when activeId is undefined', () => {
    const item: SidebarMenuItem = {
      id: 'dashboard',
      label: 'Dashboard',
      url: '/dashboard',
    }

    expect(hasActiveDescendant(item, undefined)).toBe(false)
  })

  it('returns false when no match found in children', () => {
    const item: SidebarMenuItem = {
      id: 'devices',
      label: 'Devices',
      items: [
        {
          id: 'miners',
          label: 'Miners',
          url: '/devices/miners',
        },
      ],
    }

    expect(hasActiveDescendant(item, 'containers')).toBe(false)
  })
})

describe('getFirstLeaf', () => {
  it('returns the item itself when it has no children', () => {
    const item: SidebarMenuItem = {
      id: 'dashboard',
      label: 'Dashboard',
      url: '/dashboard',
    }

    expect(getFirstLeaf(item)).toBe(item)
  })

  it('returns first child when item has children', () => {
    const firstChild: SidebarMenuItem = {
      id: 'miners',
      label: 'Miners',
      url: '/devices/miners',
    }

    const item: SidebarMenuItem = {
      id: 'devices',
      label: 'Devices',
      items: [
        firstChild,
        {
          id: 'containers',
          label: 'Containers',
          url: '/devices/containers',
        },
      ],
    }

    expect(getFirstLeaf(item)).toBe(firstChild)
  })

  it('recursively finds first leaf in nested structure', () => {
    const deepestLeaf: SidebarMenuItem = {
      id: 'users',
      label: 'Users',
      url: '/admin/settings/users',
    }

    const item: SidebarMenuItem = {
      id: 'admin',
      label: 'Admin',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          items: [deepestLeaf],
        },
      ],
    }

    expect(getFirstLeaf(item)).toBe(deepestLeaf)
  })

  it('handles empty items array as no children', () => {
    const item: SidebarMenuItem = {
      id: 'empty',
      label: 'Empty',
      url: '/empty',
      items: [],
    }

    expect(getFirstLeaf(item)).toBe(item)
  })

  it('traverses complex tree structure', () => {
    const expectedLeaf: SidebarMenuItem = {
      id: 'leaf',
      label: 'Leaf',
      url: '/a/b/c/leaf',
    }

    const item: SidebarMenuItem = {
      id: 'root',
      label: 'Root',
      items: [
        {
          id: 'branch-a',
          label: 'Branch A',
          items: [
            {
              id: 'branch-b',
              label: 'Branch B',
              items: [expectedLeaf],
            },
          ],
        },
      ],
    }

    expect(getFirstLeaf(item)).toBe(expectedLeaf)
  })
})
