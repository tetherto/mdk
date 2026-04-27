import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { getContainerColumns } from '../container-columns'
import type { DeviceExplorerDeviceData } from '../../types'

describe('getContainerColumns', () => {
  const mockRenderAction = vi.fn(() => <button>Action</button>)
  const mockGetFormattedDate = vi.fn((date: Date) => date.toISOString())
  const mockParams = { getFormattedDate: mockGetFormattedDate, renderAction: mockRenderAction }

  it('should return array of 7 columns', () => {
    const columns = getContainerColumns(mockParams)
    expect(columns).toHaveLength(7)
  })

  describe('container name column', () => {
    it('should render container name', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ode')

      const mockRow = {
        original: { info: { container: 'antspace-hydro-1' } } as DeviceExplorerDeviceData,
      }
      const result = col!.cell({ row: mockRow } as any)
      expect(result).toBeTruthy()
    })

    it('should sort containers alphabetically', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ode')

      const rowA = {
        original: { info: { container: 'container-bd-2' } } as DeviceExplorerDeviceData,
      }
      const rowB = {
        original: { info: { container: 'container-ah-1' } } as DeviceExplorerDeviceData,
      }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'ode')
      expect(typeof result).toBe('number')
    })
  })

  describe('alarms column', () => {
    it('should render alarm icon when alerts present', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'alarms')

      const mockRow = {
        original: {
          last: {
            alerts: [
              {
                name: 'alert-1',
                description: 'desc',
                severity: 'high',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        } as DeviceExplorerDeviceData,
      }

      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(
        container.querySelector('.mdk-device-explorer__table__alarms__status-container'),
      ).toBeInTheDocument()
    })

    it('should render error icon when error present', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'alarms')

      const mockRow = {
        original: {
          last: { err: 'Connection failed' },
        } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toBeTruthy()
    })

    it('should render empty when no alarms or errors', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'alarms')

      const mockRow = {
        original: { last: {} } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toBe('')
    })
  })

  describe('status column', () => {
    it('should render status when online', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'status')

      const mockRow = {
        original: {
          last: { snap: { stats: { status: 'running' } } },
        } as DeviceExplorerDeviceData,
      }

      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toContain('running')
    })

    it('should show offline label when offline', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'status')

      const mockRow = {
        original: {
          last: { snap: {} },
        } as DeviceExplorerDeviceData,
      }

      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(
        container.querySelector('.mdk-device-explorer__table__cell-wrapper'),
      ).toBeInTheDocument()
    })
  })

  describe('temperature column', () => {
    it('should render temperature when available', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'temperatureAmbient')

      const mockRow = {
        original: {
          last: { snap: { stats: { ambient_temp_c: 25, status: 'running' } } },
        } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toContain('25')
      expect(result).toContain('°C')
    })

    it('should render empty when offline', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'temperatureAmbient')

      const mockRow = {
        original: { last: { snap: {} } } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toBe('')
    })

    it('should sort by temperature', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'temperatureAmbient')

      const rowA = {
        original: { last: { snap: { stats: { ambient_temp_c: 30 } } } } as DeviceExplorerDeviceData,
      }
      const rowB = {
        original: { last: { snap: { stats: { ambient_temp_c: 20 } } } } as DeviceExplorerDeviceData,
      }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'temperatureAmbient')
      expect(result).toBe(10)
    })
  })

  describe('humidity column', () => {
    it('should render humidity when online', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'humidity')

      const mockRow = {
        original: {
          last: { snap: { stats: { humidity_percent: 65, status: 'running' } } },
        } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toContain('65')
      expect(result).toContain('%')
    })

    it('should render empty when offline', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'humidity')

      const mockRow = {
        original: { last: { snap: {} } } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toContain('0')
    })

    it('should sort by humidity', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'humidity')

      const rowA = {
        original: {
          last: { snap: { stats: { humidity_percent: 70 } } },
        } as DeviceExplorerDeviceData,
      }
      const rowB = {
        original: {
          last: { snap: { stats: { humidity_percent: 50 } } },
        } as DeviceExplorerDeviceData,
      }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'humidity')
      expect(result).toBe(20)
    })
  })

  describe('consumption column', () => {
    it('should render power consumption when online', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'consumption')

      const mockRow = {
        original: {
          last: { snap: { stats: { power_w: 8000, status: 'running' } } },
        } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toContain('8')
      expect(result).toContain('kW')
    })

    it('should render zero when offline', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'consumption')

      const mockRow = {
        original: { last: { snap: {} } } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toContain('0')
    })

    it('should sort by power consumption', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'consumption')

      const rowA = {
        original: { last: { snap: { stats: { power_w: 9000 } } } } as DeviceExplorerDeviceData,
      }
      const rowB = {
        original: { last: { snap: { stats: { power_w: 5000 } } } } as DeviceExplorerDeviceData,
      }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'consumption')
      expect(result).toBe(4000)
    })
  })

  describe('action column', () => {
    it('should render action when online', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'action')

      const mockRow = {
        original: {
          last: { snap: { stats: { status: 'running' } } },
        } as DeviceExplorerDeviceData,
      }

      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.querySelector('button')).toBeInTheDocument()
    })

    it('should return null when offline', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'action')

      const mockRow = {
        original: { last: { snap: { stats: { status: 'offline' } } } } as DeviceExplorerDeviceData,
      }

      const result = col!.cell({ row: mockRow } as any)
      expect(result).toBeNull()
    })

    it('should have sorting disabled', () => {
      const columns = getContainerColumns(mockParams)
      const col = columns.find((c) => c.id === 'action')
      expect(col!.enableSorting).toBe(false)
    })
  })
})
