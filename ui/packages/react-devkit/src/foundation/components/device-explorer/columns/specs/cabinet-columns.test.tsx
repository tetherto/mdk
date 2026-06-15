import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { getCabinetColumns } from '../cabinet-columns'
import type { DeviceExplorerDeviceData } from '../../types'

describe('getCabinetColumns', () => {
  const mockRenderAction = vi.fn(() => <button>Action</button>)

  it('should return array of 4 columns', () => {
    const columns = getCabinetColumns({ renderAction: mockRenderAction })
    expect(columns).toHaveLength(4)
  })

  describe('cabinet column', () => {
    it('should render cabinet title', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const cabinetCol = columns.find((col) => col.id === 'id')
      expect(cabinetCol).toBeDefined()

      const mockRow = {
        original: { id: 'lv-1' } as DeviceExplorerDeviceData,
      }
      const result = cabinetCol!.cell({ row: mockRow } as any)
      expect(result).toContain('LV Cabinet')
    })

    it('should sort cabinets alphabetically', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const cabinetCol = columns.find((col) => col.id === 'id')

      const rowA = { original: { id: 'lv-2' } as DeviceExplorerDeviceData }
      const rowB = { original: { id: 'lv-1' } as DeviceExplorerDeviceData }

      const result = cabinetCol!.sortingFn!(rowA as any, rowB as any, 'id')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('temperature column', () => {
    it('should render temperature when available', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const tempCol = columns.find((col) => col.id === 'temperature')
      expect(tempCol).toBeDefined()

      const mockRow = {
        original: {
          rootTempSensor: {
            last: { snap: { stats: { temp_c: 55 } } },
          },
        } as unknown as DeviceExplorerDeviceData,
      }

      const { container } = render(tempCol!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toContain('55')
      expect(container.textContent).toContain('°C')
    })

    it('should render dash when temperature is nil', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const tempCol = columns.find((col) => col.id === 'temperature')

      const mockRow = {
        original: {} as DeviceExplorerDeviceData,
      }

      const { container } = render(tempCol!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toContain('-')
    })

    it('should sort by temperature', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const tempCol = columns.find((col) => col.id === 'temperature')

      const rowA = {
        original: {
          rootTempSensor: { last: { snap: { stats: { temp_c: 60 } } } },
        } as unknown as DeviceExplorerDeviceData,
      }
      const rowB = {
        original: {
          rootTempSensor: { last: { snap: { stats: { temp_c: 50 } } } },
        } as unknown as DeviceExplorerDeviceData,
      }

      const result = tempCol!.sortingFn!(rowA as any, rowB as any, 'temperature')
      expect(result).toBe(10)
    })
  })

  describe('consumption column', () => {
    it('should render power consumption', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const powerCol = columns.find((col) => col.id === 'powerMode')
      expect(powerCol).toBeDefined()

      const mockRow = {
        original: {
          powerMeters: [{ last: { snap: { stats: { power_w: 5000 } } } }],
        } as unknown as DeviceExplorerDeviceData,
      }

      const result = powerCol!.cell({ row: mockRow } as any)
      expect(result).toContain('5')
      expect(result).toContain('kW')
    })

    it('should handle zero power', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const powerCol = columns.find((col) => col.id === 'powerMode')

      const mockRow = {
        original: {
          powerMeters: [{ last: { snap: { stats: { power_w: 0 } } } }],
        } as unknown as DeviceExplorerDeviceData,
      }

      const result = powerCol!.cell({ row: mockRow } as any)
      expect(result).toContain('0')
    })

    it('should sort by power consumption', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const powerCol = columns.find((col) => col.id === 'powerMode')

      const rowA = {
        original: {
          powerMeters: [{ last: { snap: { stats: { power_w: 6000 } } } }],
        } as unknown as DeviceExplorerDeviceData,
      }
      const rowB = {
        original: {
          powerMeters: [{ last: { snap: { stats: { power_w: 3000 } } } }],
        } as unknown as DeviceExplorerDeviceData,
      }

      const result = powerCol!.sortingFn!(rowA as any, rowB as any, 'powerMode')
      expect(result).toBe(3000)
    })
  })

  describe('action column', () => {
    it('should render action when container is online', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const actionCol = columns.find((col) => col.id === 'action')
      expect(actionCol).toBeDefined()

      const mockRow = {
        original: {
          last: { snap: { stats: { status: 'running' } } },
        } as DeviceExplorerDeviceData,
      }

      const { container } = render(actionCol!.cell({ row: mockRow } as any) as any)
      expect(container.querySelector('button')).toBeInTheDocument()
    })

    it('should return null when container is offline', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const actionCol = columns.find((col) => col.id === 'action')

      const mockRow = {
        original: {
          last: { snap: { stats: { status: 'offline' } } },
        } as DeviceExplorerDeviceData,
      }

      const result = actionCol!.cell({ row: mockRow } as any)
      expect(result).toBeNull()
    })

    it('should have sorting disabled', () => {
      const columns = getCabinetColumns({ renderAction: mockRenderAction })
      const actionCol = columns.find((col) => col.id === 'action')
      expect(actionCol!.enableSorting).toBe(false)
    })
  })

  it('should have correct column headers', () => {
    const columns = getCabinetColumns({ renderAction: mockRenderAction })
    const headers = columns.map((col) => col.header)
    expect(headers).toEqual(['Cabinet', 'Temperature', 'Consumption', 'Action'])
  })

  it('should have correct column ids', () => {
    const columns = getCabinetColumns({ renderAction: mockRenderAction })
    const ids = columns.map((col) => col.id)
    expect(ids).toEqual(['id', 'temperature', 'powerMode', 'action'])
  })
})
