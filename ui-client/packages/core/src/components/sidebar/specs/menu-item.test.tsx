import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MenuItemInternal } from '../menu-item'
import { OverlayContent } from '../overlay-content'
import type { SidebarMenuItem } from '../types'

const leafItem: SidebarMenuItem = {
  id: 'dashboard',
  label: 'Dashboard',
}

const itemWithChildren: SidebarMenuItem = {
  id: 'devices',
  label: 'Devices',
  items: [
    { id: 'miners', label: 'Miners' },
    { id: 'containers', label: 'Containers' },
  ],
}

describe('menuItemInternal', () => {
  it('renders leaf item with label', () => {
    render(
      <MenuItemInternal
        item={leafItem}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('applies active class when item id matches activeId', () => {
    const { container } = render(
      <MenuItemInternal
        item={leafItem}
        activeId="dashboard"
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    expect(container.querySelector('.mdk-sidebar__item--active')).toBeInTheDocument()
  })

  it('calls onItemClick when leaf item is clicked', () => {
    const onItemClick = vi.fn()
    render(
      <MenuItemInternal
        item={leafItem}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onItemClick={onItemClick}
        onOverlayChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))

    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith(leafItem)
  })

  it('does not call onItemClick when disabled leaf item is clicked', () => {
    const onItemClick = vi.fn()
    render(
      <MenuItemInternal
        item={{ ...leafItem, disabled: true }}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onItemClick={onItemClick}
        onOverlayChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))

    expect(onItemClick).not.toHaveBeenCalled()
  })

  it('renders disabled attribute when item is disabled', () => {
    render(
      <MenuItemInternal
        item={{ ...leafItem, disabled: true }}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeDisabled()
  })

  it('renders group with children when isExpanded', () => {
    render(
      <MenuItemInternal
        item={itemWithChildren}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Devices' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Expand Devices/ })).toBeInTheDocument()
  })

  it('toggles group open state when expand/collapse button is clicked', () => {
    render(
      <MenuItemInternal
        item={itemWithChildren}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    const toggle = screen.getByRole('button', { name: /Expand Devices/ })
    fireEvent.click(toggle)

    expect(screen.getByText('Miners')).toBeInTheDocument()
    expect(screen.getByText('Containers')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Collapse Devices/ }))

    expect(screen.queryByText('Miners')).not.toBeInTheDocument()
  })

  it('calls onItemClick with first leaf when group item is clicked', () => {
    const onItemClick = vi.fn()
    render(
      <MenuItemInternal
        item={itemWithChildren}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onItemClick={onItemClick}
        onOverlayChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Devices' }))

    expect(onItemClick).toHaveBeenCalledWith({ id: 'miners', label: 'Miners' })
  })

  it('renders icon when item has icon', () => {
    const { container } = render(
      <MenuItemInternal
        item={{ ...leafItem, icon: <span data-testid="icon">Icon</span> }}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    expect(container.querySelector('.mdk-sidebar__item-icon')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('expands group via keyboard Enter on the toggle button', () => {
    // Use a unique id so this test is unaffected by useSidebarSectionState from other tests
    const freshItem = {
      id: 'kb-enter-group',
      label: 'KB Group',
      items: [{ id: 'kb-child', label: 'KB Child' }],
    }
    render(
      <MenuItemInternal
        item={freshItem}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    const toggle = screen.getByRole('button', { name: /Expand KB Group/ })
    fireEvent.keyDown(toggle, { key: 'Enter' })

    expect(screen.getByText('KB Child')).toBeInTheDocument()
  })

  it('expands group via keyboard Space on the toggle button', () => {
    // Use a unique id so this test is unaffected by useSidebarSectionState from other tests
    const freshItem = {
      id: 'kb-space-group',
      label: 'KB Space',
      items: [{ id: 'kb-space-child', label: 'Space Child' }],
    }
    render(
      <MenuItemInternal
        item={freshItem}
        activeId=""
        overlayId={null}
        isExpanded={true}
        onOverlayChange={() => {}}
      />,
    )

    const toggle = screen.getByRole('button', { name: /Expand KB Space/ })
    fireEvent.keyDown(toggle, { key: ' ' })

    expect(screen.getByText('Space Child')).toBeInTheDocument()
  })

  it('renders portal overlay when overlayId matches and sidebar is collapsed', () => {
    render(
      <MenuItemInternal
        item={itemWithChildren}
        activeId=""
        overlayId={itemWithChildren.id}
        isExpanded={false}
        inOverlay={false}
        onOverlayChange={() => {}}
      />,
    )

    // createPortal renders into document.body
    expect(document.body.querySelector('.mdk-sidebar__overlay')).toBeInTheDocument()
  })

  it('calls onOverlayChange and onItemClick when overlay item is clicked', () => {
    const onOverlayChange = vi.fn()
    const onItemClick = vi.fn()

    render(
      <MenuItemInternal
        item={itemWithChildren}
        activeId=""
        overlayId={itemWithChildren.id}
        isExpanded={false}
        inOverlay={false}
        onOverlayChange={onOverlayChange}
        onItemClick={onItemClick}
      />,
    )

    const minerBtn = document.body.querySelector<HTMLButtonElement>('.mdk-sidebar__overlay button')
    expect(minerBtn).toBeTruthy()
    fireEvent.click(minerBtn!)

    expect(onOverlayChange).toHaveBeenCalledWith(null)
    expect(onItemClick).toHaveBeenCalled()
  })

  it('renders nested overlay when inOverlay=true, collapsed, and overlayId matches', () => {
    const { container } = render(
      <MenuItemInternal
        item={itemWithChildren}
        activeId=""
        overlayId={itemWithChildren.id}
        isExpanded={false}
        inOverlay={true}
        onOverlayChange={() => {}}
      />,
    )

    expect(container.querySelector('.mdk-sidebar__overlay--nested')).toBeInTheDocument()
  })
})

describe('overlayContent', () => {
  it('renders menu items for each child', () => {
    render(<OverlayContent items={itemWithChildren.items!} activeId="" onItemClick={() => {}} />)

    expect(screen.getByRole('button', { name: 'Miners' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Containers' })).toBeInTheDocument()
  })

  it('calls onItemClick when a child item is clicked', () => {
    const onItemClick = vi.fn()
    render(<OverlayContent items={itemWithChildren.items!} activeId="" onItemClick={onItemClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Miners' }))

    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith({ id: 'miners', label: 'Miners' })
  })

  it('applies active styling for activeId', () => {
    const { container } = render(
      <OverlayContent
        items={itemWithChildren.items!}
        activeId="containers"
        onItemClick={() => {}}
      />,
    )

    expect(container.querySelector('.mdk-sidebar__item--active')).toBeInTheDocument()
  })
})
