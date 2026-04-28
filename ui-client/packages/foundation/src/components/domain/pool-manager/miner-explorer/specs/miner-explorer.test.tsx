import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DataTableRowSelectionState } from '@tetherto/core'
import { configureStore } from '@reduxjs/toolkit'
import { useState } from 'react'
import { Provider } from 'react-redux'
import type { MinerExplorerProps } from '../'
import { MinerExplorer } from '../'
import { timezoneSlice } from '../../../../../state'
import type { Device } from '../../../../../types'
import type { MinerRecord } from '../../types'

const { mockOnFiltersChange } = vi.hoisted(() => ({
  mockOnFiltersChange: vi.fn(),
}))

vi.mock('../../../../hooks/use-list-view-filters', () => ({
  useListViewFilters: vi.fn(() => ({
    onFiltersChange: mockOnFiltersChange,
    filters: {},
  })),
}))

vi.mock('../../../../hooks/use-timezone', () => ({
  useTimezone: vi.fn(() => ({
    getFormattedDate: (date: Date | number) => new Date(date).toISOString(),
  })),
}))

vi.mock('../hooks/use-pool-configs', () => ({
  usePoolConfigs: vi.fn(() => ({
    poolIdMap: {},
    pools: [],
  })),
}))

vi.mock('../miner-explorer-utils', () => ({
  mapDeviceToMinerRecord: vi.fn((device: { id: string }) => ({
    id: device.id,
    code: `M-${device.id}`,
    status: 'mining',
    lastSyncedAt: new Date(0),
    tags: [],
    raw: device,
  })),
}))

vi.mock('@radix-ui/react-use-controllable-state', () => ({
  useControllableState: vi.fn(
    ({
      prop,
      defaultProp,
      onChange,
    }: {
      prop: DataTableRowSelectionState | undefined
      defaultProp: DataTableRowSelectionState
      onChange?: (v: DataTableRowSelectionState) => void
    }) => {
      const [state, setState] = useState(prop ?? defaultProp)
      return [
        state,
        (next: DataTableRowSelectionState) => {
          setState(next)
          onChange?.(next)
        },
      ]
    },
  ),
}))

vi.mock('@tetherto/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...original,
    cn: (...args: string[]) => args.filter(Boolean).join(' '),
    Loader: () => <div data-testid="loader" />,
    CoreAlert: ({ type, title }: { type: string; title: string }) => (
      <div data-testid="alert" data-type={type}>
        {title}
      </div>
    ),
  }
})

vi.mock('../miner-explorer-toolbar', () => ({
  MinerExplorerToolbar: ({
    searchTags,
    modelFilter,
    statusFilter,
    poolFilter,
    onModelChange,
    onStatusChange,
    onPoolChange,
    onSearchTagsChange,
  }: {
    searchTags: string[]
    modelFilter: string | null
    statusFilter: string | null
    poolFilter: string | null
    onModelChange: (v: string | null) => void
    onStatusChange: (v: string | null) => void
    onPoolChange: (v: string | null) => void
    onSearchTagsChange: (v: string[]) => void
  }) => (
    <div data-testid="miner-explorer-toolbar">
      <button data-testid="model-change" onClick={() => onModelChange('miner-am-s19xp')} />
      <button data-testid="model-clear" onClick={() => onModelChange(null)} />
      <button data-testid="status-change" onClick={() => onStatusChange('mining')} />
      <button data-testid="status-clear" onClick={() => onStatusChange(null)} />
      <button data-testid="pool-change" onClick={() => onPoolChange('pool-1')} />
      <button data-testid="pool-clear" onClick={() => onPoolChange(null)} />
      <button data-testid="search-change" onClick={() => onSearchTagsChange(['tag1'])} />
      <span data-testid="toolbar-model-filter">{modelFilter ?? 'null'}</span>
      <span data-testid="toolbar-status-filter">{statusFilter ?? 'null'}</span>
      <span data-testid="toolbar-pool-filter">{poolFilter ?? 'null'}</span>
      <span data-testid="toolbar-search-tags">{searchTags?.join(',')}</span>
    </div>
  ),
}))

vi.mock('../miner-explorer-table', () => ({
  MinerExplorerTable: ({
    data,
    loading,
  }: {
    data: MinerRecord[]
    loading: boolean | undefined
    selections: DataTableRowSelectionState
    onSelectionsChange: (s: DataTableRowSelectionState) => void
    getFormattedDate: (date: Date | number, fixedTimezone?: string, formatString?: string) => string
  }) => (
    <div
      data-testid="miner-explorer-table"
      data-loading={String(loading ?? false)}
      data-row-count={data?.length ?? 0}
    />
  ),
}))

const makeDevice = (id: string) =>
  ({
    id,
    code: `M-${id}`,
    type: 'miner-am-s19xp',
    tags: [],
    last: { ts: 0, snap: { stats: { status: 'mining' } } },
  }) as unknown as MinerExplorerProps['data'][0]

const defaultProps: MinerExplorerProps = {
  data: [makeDevice('1'), makeDevice('2')],
  isLoading: false,
  isFetching: false,
  hasError: false,
  poolConfig: [],
  site: 'my-site',
  availableDevices: { availableContainerTypes: [], availableMinerTypes: [] },
  typeFiltersForSite: [],
  onSelectedDevicesChange: vi.fn(),
}

const createMockStore = (selectedDevices: Device[] = []) => {
  return configureStore({
    reducer: {
      timezone: timezoneSlice.reducer,
      devices: () => ({
        selectedDevices,
      }),
    },
  })
}

const renderExplorer = (props: Partial<MinerExplorerProps> = {}) =>
  render(
    <Provider store={createMockStore()}>
      <MinerExplorer {...defaultProps} {...props} />
    </Provider>,
  )

describe('MinerExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('renders Loader when isLoading is true', () => {
      renderExplorer({ isLoading: true })
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not render toolbar when isLoading is true', () => {
      renderExplorer({ isLoading: true })
      expect(screen.queryByTestId('miner-explorer-toolbar')).not.toBeInTheDocument()
    })

    it('does not render table when isLoading is true', () => {
      renderExplorer({ isLoading: true })
      expect(screen.queryByTestId('miner-explorer-table')).not.toBeInTheDocument()
    })

    it('does not render Loader when isLoading is false', () => {
      renderExplorer({ isLoading: false })
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument()
    })

    it('applies className to loading wrapper', () => {
      const { container } = renderExplorer({ isLoading: true, className: 'custom-class' })
      expect(container.firstChild).toHaveClass('mdk-pm-miner-explorer', 'custom-class')
    })
  })

  describe('root element', () => {
    it('renders root div with base class', () => {
      const { container } = renderExplorer()
      expect(container.firstChild).toHaveClass('mdk-pm-miner-explorer')
    })

    it('appends custom className', () => {
      const { container } = renderExplorer({ className: 'my-class' })
      expect(container.firstChild).toHaveClass('mdk-pm-miner-explorer', 'my-class')
    })

    it('renders toolbar and table when not loading', () => {
      renderExplorer()
      expect(screen.getByTestId('miner-explorer-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('miner-explorer-table')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders CoreAlert when hasError is true', () => {
      renderExplorer({ hasError: true })
      expect(screen.getByTestId('alert')).toBeInTheDocument()
    })

    it('CoreAlert has type="error"', () => {
      renderExplorer({ hasError: true })
      expect(screen.getByTestId('alert')).toHaveAttribute('data-type', 'error')
    })

    it('CoreAlert displays error title', () => {
      renderExplorer({ hasError: true })
      expect(screen.getByTestId('alert')).toHaveTextContent('Error loading data')
    })

    it('does not render CoreAlert when hasError is false', () => {
      renderExplorer({ hasError: false })
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
    })

    it('still renders toolbar and table when hasError is true', () => {
      renderExplorer({ hasError: true })
      expect(screen.getByTestId('miner-explorer-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('miner-explorer-table')).toBeInTheDocument()
    })
  })

  describe('table props', () => {
    it('passes mapped data to MinerExplorerTable', () => {
      renderExplorer()
      expect(screen.getByTestId('miner-explorer-table')).toHaveAttribute('data-row-count', '2')
    })

    it('passes isFetching as loading to MinerExplorerTable', () => {
      renderExplorer({ isFetching: true })
      expect(screen.getByTestId('miner-explorer-table')).toHaveAttribute('data-loading', 'true')
    })

    it('passes isFetching=false as loading to MinerExplorerTable', () => {
      renderExplorer({ isFetching: false })
      expect(screen.getByTestId('miner-explorer-table')).toHaveAttribute('data-loading', 'false')
    })

    it('passes empty data array correctly', () => {
      renderExplorer({ data: [] })
      expect(screen.getByTestId('miner-explorer-table')).toHaveAttribute('data-row-count', '0')
    })
  })

  describe('toolbar filter state', () => {
    it('initial modelFilter is null', () => {
      renderExplorer()
      expect(screen.getByTestId('toolbar-model-filter')).toHaveTextContent('null')
    })

    it('initial statusFilter is null', () => {
      renderExplorer()
      expect(screen.getByTestId('toolbar-status-filter')).toHaveTextContent('null')
    })

    it('initial poolFilter is null', () => {
      renderExplorer()
      expect(screen.getByTestId('toolbar-pool-filter')).toHaveTextContent('null')
    })

    it('updates modelFilter when onModelChange is called', async () => {
      renderExplorer()
      await act(async () => screen.getByTestId('model-change').click())
      expect(screen.getByTestId('toolbar-model-filter')).toHaveTextContent('miner-am-s19xp')
    })

    it('clears modelFilter when onModelChange(null) is called', async () => {
      renderExplorer()
      await act(async () => screen.getByTestId('model-change').click())
      await act(async () => screen.getByTestId('model-clear').click())
      expect(screen.getByTestId('toolbar-model-filter')).toHaveTextContent('null')
    })

    it('updates statusFilter when onStatusChange is called', async () => {
      renderExplorer()
      await act(async () => screen.getByTestId('status-change').click())
      expect(screen.getByTestId('toolbar-status-filter')).toHaveTextContent('mining')
    })

    it('clears statusFilter when onStatusChange(null) is called', async () => {
      renderExplorer()
      await act(async () => screen.getByTestId('status-change').click())
      await act(async () => screen.getByTestId('status-clear').click())
      expect(screen.getByTestId('toolbar-status-filter')).toHaveTextContent('null')
    })

    it('updates poolFilter when onPoolChange is called', async () => {
      renderExplorer()
      await act(async () => screen.getByTestId('pool-change').click())
      expect(screen.getByTestId('toolbar-pool-filter')).toHaveTextContent('pool-1')
    })

    it('clears poolFilter when onPoolChange(null) is called', async () => {
      renderExplorer()
      await act(async () => screen.getByTestId('pool-change').click())
      await act(async () => screen.getByTestId('pool-clear').click())
      expect(screen.getByTestId('toolbar-pool-filter')).toHaveTextContent('null')
    })
  })

  describe('search tags', () => {
    it('initial searchTags is empty', () => {
      renderExplorer()
      expect(screen.getByTestId('toolbar-search-tags')).toHaveTextContent('')
    })

    it('updates searchTags when toolbar fires onSearchTagsChange', async () => {
      renderExplorer()
      await act(async () => screen.getByTestId('search-change').click())
      expect(screen.getByTestId('toolbar-search-tags')).toHaveTextContent('tag1')
    })
  })
})
