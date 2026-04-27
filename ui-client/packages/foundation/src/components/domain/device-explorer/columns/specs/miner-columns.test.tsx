import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { getMinerColumns } from '../miner-columns'
import type { MinerRecord } from '../../../../../types/device'

describe('getMinerColumns', () => {
  const mockGetFormattedDate = vi.fn((date: Date) => date.toISOString())
  const mockParams = { getFormattedDate: mockGetFormattedDate }

  it('should return array of columns', () => {
    const columns = getMinerColumns(mockParams)
    expect(columns.length).toBeGreaterThan(10)
  })

  describe('code column', () => {
    it('should render short code', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'shortCode')

      const mockInfo = {
        row: { original: { shortCode: 'M-001' } },
        getValue: () => 'M-001',
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toBe('M-001')
    })

    it('should sort by miner type name', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'shortCode')

      const rowA = { original: { type: 'miner-am-s19' } }
      const rowB = { original: { type: 'miner-am-s21' } }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'shortCode')
      expect(typeof result).toBe('number')
    })
  })

  describe('container column', () => {
    it('should render normal container name', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'container')

      const mockInfo = {
        row: { original: { err: undefined, error: undefined } },
        getValue: () => 'container-1',
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toContain('container-1')
    })

    it('should render maintenance container with warning style', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'container')

      const mockInfo = {
        row: { original: { err: undefined, error: undefined } },
        getValue: () => 'maintenance',
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toContain('Maintenance')
    })

    it('should render error message when err present', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'container')

      const mockInfo = {
        row: { original: { err: 'ERR_THING_CONNECTION_FAILURE', error: undefined } },
        getValue: () => 'container-1',
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toContain('No Connection')
    })

    it('should render custom error when not in ERROR_MESSAGES', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'container')

      const mockInfo = {
        row: { original: { err: 'CUSTOM_ERROR', error: undefined } },
        getValue: () => 'container-1',
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toContain('CUSTOM_ERROR')
    })

    it('should sort by container name', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'container')

      const rowA = { original: { info: { container: 'container-b' } } }
      const rowB = { original: { info: { container: 'container-a' } } }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'container')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('position column', () => {
    it('should render position', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'position')

      const mockRow = { original: { info: { pos: 'A-12' } } }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('A-12')
    })

    it('should sort by position', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'position')

      const rowA = { original: { info: { pos: 'B-1' } } }
      const rowB = { original: { info: { pos: 'A-1' } } }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'position')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('serial number column', () => {
    it('should render serial number', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'serialNum')

      const mockInfo = {
        row: { original: {} },
        getValue: () => 'SN123456',
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toBe('SN123456')
    })

    it('should sort by serial number', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'serialNum')

      const rowA = { original: { info: { serialNum: 'SN002' } } }
      const rowB = { original: { info: { serialNum: 'SN001' } } }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'serialNum')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('mAC address column', () => {
    it('should render formatted MAC address', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'macAddress')

      const mockInfo = {
        row: { original: {} },
        getValue: () => 'aabbccddeeff',
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toBeTruthy()
    })

    it('should render dash when MAC is undefined', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'macAddress')

      const mockInfo = {
        row: { original: {} },
        getValue: () => undefined,
      }
      const { container } = render(col!.cell(mockInfo as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by MAC address', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.accessorKey === 'macAddress')

      const rowA = { original: { info: { macAddress: 'bb:bb:bb:bb:bb:bb' } } }
      const rowB = { original: { info: { macAddress: 'aa:aa:aa:aa:aa:aa' } } }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'macAddress')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('iP column', () => {
    it('should render IP address', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ip')

      const mockRow = { original: { address: '192.168.1.100' } }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('192.168.1.100')
    })

    it('should sort by IP address', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ip')

      const rowA = { original: { address: '192.168.1.2' } }
      const rowB = { original: { address: '192.168.1.1' } }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'ip')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('status column', () => {
    it('should render miner status', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'status')

      const mockRow = {
        original: {
          stats: { status: 'mining' },
          alerts: [],
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toContain('mining')
    })

    it('should render with alerts', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'status')

      const mockRow = {
        original: {
          stats: { status: 'mining' },
          alerts: [
            {
              name: 'alert',
              description: 'test',
              severity: 'high',
              createdAt: new Date().toISOString(),
            },
          ],
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(
        container.querySelector('.mdk-device-explorer__table__cell--type-status'),
      ).toBeInTheDocument()
    })

    it('should sort by status', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'status')

      const rowA = { original: { stats: { status: 'offline' } } as MinerRecord }
      const rowB = { original: { stats: { status: 'mining' } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'status')
      expect(typeof result).toBe('number')
    })
  })

  describe('power mode column', () => {
    it('should render power mode when online', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'powerMode')

      const mockRow = {
        original: {
          device: { last: { snap: { config: { power_mode: 'high' } } } },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toContain('high')
    })

    it('should render dash when error present', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'powerMode')

      const mockRow = {
        original: {
          error: 'Error message',
          device: { last: { snap: { config: { power_mode: 'high' } } } },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'powerMode')

      const mockRow = {
        original: {
          device: { last: { snap: { stats: {}, config: {} } } },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by power mode', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'powerMode')

      const rowA = { original: { config: { power_mode: 'high' } } as MinerRecord }
      const rowB = { original: { config: { power_mode: 'low' } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'powerMode')
      expect(typeof result).toBe('number')
    })
  })

  describe('elapsed time column', () => {
    it('should render elapsed time when online', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'elapsedTime')

      const mockRow = {
        original: {
          stats: { uptime_ms: 3600000 },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBeTruthy()
    })

    it('should render dash when error present', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'elapsedTime')

      const mockRow = {
        original: {
          error: 'Error',
          stats: { uptime_ms: 3600000 },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'elapsedTime')

      const mockRow = {
        original: {
          device: { last: { snap: { stats: {}, config: {} } } },
          stats: { uptime_ms: 3600000 },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by uptime', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'elapsedTime')

      const rowA = { original: { stats: { uptime_ms: 7200000 } } as MinerRecord }
      const rowB = { original: { stats: { uptime_ms: 3600000 } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'elapsedTime')
      expect(typeof result).toBe('number')
    })
  })

  describe('consumption column', () => {
    it('should render power consumption when online', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'consumption')

      const mockRow = {
        original: {
          stats: { power_w: 3500 },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toContain('3.50')
      expect(container.textContent).toContain('kW')
    })

    it('should render dash when power is zero', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'consumption')

      const mockRow = {
        original: {
          stats: { power_w: 0 },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should render dash when error present', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'consumption')

      const mockRow = {
        original: {
          error: 'Error',
          stats: { power_w: 3500 },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by power', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'consumption')

      const rowA = { original: { stats: { power_w: 4000 } } as MinerRecord }
      const rowB = { original: { stats: { power_w: 3000 } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'consumption')
      expect(typeof result).toBe('number')
    })
  })

  describe('hashrate column', () => {
    it('should render hashrate when online', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'hashrate')

      const mockRow = {
        original: {
          stats: { hashrate_mhs: { t_5m: 100000 } },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(
        container.querySelector('.mdk-device-explorer__table__cell--type-hash-rate'),
      ).toBeInTheDocument()
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'hashrate')

      const mockRow = {
        original: {
          device: { last: { snap: { stats: {}, config: {} } } },
          stats: { hashrate_mhs: { t_5m: 100000 } },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by hashrate', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'hashrate')

      const rowA = { original: { stats: { hashrate_mhs: { t_5m: 200000 } } } as MinerRecord }
      const rowB = { original: { stats: { hashrate_mhs: { t_5m: 100000 } } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'hashrate')
      expect(typeof result).toBe('number')
    })
  })

  describe('efficiency column', () => {
    it('should render efficiency when data available', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'efficiency')

      const mockRow = {
        original: {
          stats: { power_w: 3500, hashrate_mhs: { t_5m: 100000 } },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(
        container.querySelector('.mdk-device-explorer__table__cell--type-efficiency'),
      ).toBeInTheDocument()
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'efficiency')

      const mockRow = {
        original: {
          device: { last: { snap: { stats: {}, config: {} } } },
          stats: { power_w: 3500, hashrate_mhs: { t_5m: 100000 } },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should render dash when hashrate is zero', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'efficiency')

      const mockRow = {
        original: {
          stats: { power_w: 3500, hashrate_mhs: { t_5m: 0 } },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by efficiency', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'efficiency')

      const rowA = {
        original: { stats: { power_w: 4000, hashrate_mhs: { t_5m: 100000 } } } as MinerRecord,
      }
      const rowB = {
        original: { stats: { power_w: 3000, hashrate_mhs: { t_5m: 100000 } } } as MinerRecord,
      }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'efficiency')
      expect(typeof result).toBe('number')
    })
  })

  describe('pool hashrate column', () => {
    it('should render pool hashrate when enabled', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'poolHashrate')

      const mockRow = {
        original: {
          isPoolStatsEnabled: true,
          stats: { poolHashrate: '100 TH/s' },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(
        container.querySelector('.mdk-device-explorer__table__cell--type-hash-rate'),
      ).toBeInTheDocument()
    })

    it('should render dash when not enabled', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'poolHashrate')

      const mockRow = {
        original: {
          isPoolStatsEnabled: false,
          stats: { poolHashrate: '100 TH/s' },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'poolHashrate')

      const mockRow = {
        original: {
          isPoolStatsEnabled: true,
          device: { last: { snap: { stats: {}, config: {} } } },
          stats: { poolHashrate: '100 TH/s' },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by pool hashrate', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'poolHashrate')

      const rowA = { original: { stats: { poolHashrate: '200 TH/s' } } as MinerRecord }
      const rowB = { original: { stats: { poolHashrate: '100 TH/s' } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'poolHashrate')
      expect(typeof result).toBe('number')
    })
  })

  describe('firmware version column', () => {
    it('should render firmware version when online', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'fwVersion')

      const mockRow = {
        original: {
          config: { firmware_ver: 'v2.1.0' },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('v2.1.0')
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'fwVersion')

      const mockRow = {
        original: {
          device: { last: { snap: { stats: {}, config: {} } } },
          config: { firmware_ver: 'v2.1.0' },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by firmware version', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'fwVersion')

      const rowA = { original: { config: { firmware_ver: 'v2.0.0' } } as MinerRecord }
      const rowB = { original: { config: { firmware_ver: 'v1.0.0' } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'fwVersion')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('lED status column', () => {
    it('should render LED on', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ledStatus')

      const mockRow = {
        original: {
          config: { led_status: true },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('On')
    })

    it('should render LED off', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ledStatus')

      const mockRow = {
        original: {
          config: { led_status: false },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('Off')
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ledStatus')

      const mockRow = {
        original: {
          device: { last: { snap: { stats: {}, config: {} } } },
          config: { led_status: true },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should render dash when led_status is undefined', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ledStatus')

      const mockRow = {
        original: {
          config: { led_status: undefined },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by LED status', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'ledStatus')

      const rowA = { original: { config: { led_status: true } } as MinerRecord }
      const rowB = { original: { config: { led_status: false } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'ledStatus')
      expect(typeof result).toBe('number')
    })
  })

  describe('max temperature column', () => {
    it('should render max temperature when online', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'temperature')

      const mockRow = {
        original: {
          stats: { temperature_c: { max: 75 } },
          error: undefined,
          err: undefined,
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toContain('75')
      expect(container.textContent).toContain('°C')
    })

    it('should render dash when offline', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'temperature')

      const mockRow = {
        original: {
          device: { last: { snap: { stats: {}, config: {} } } },
          stats: { temperature_c: { max: 75 } },
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should render dash when temperature not available', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'temperature')

      const mockRow = {
        original: {
          stats: {},
        } as MinerRecord,
      }
      const { container } = render(col!.cell({ row: mockRow } as any) as any)
      expect(container.textContent).toBe('-')
    })

    it('should sort by max temperature', () => {
      const columns = getMinerColumns(mockParams)
      const col = columns.find((c) => c.id === 'temperature')

      const rowA = { original: { stats: { temperature_c: { max: 80 } } } as MinerRecord }
      const rowB = { original: { stats: { temperature_c: { max: 70 } } } as MinerRecord }

      const result = col!.sortingFn!(rowA as any, rowB as any, 'temperature')
      expect(typeof result).toBe('number')
    })
  })

  it('should have correct column headers', () => {
    const columns = getMinerColumns(mockParams)
    const headers = columns.map((col) => col.header)
    expect(headers).toContain('Code')
    expect(headers).toContain('Container')
    expect(headers).toContain('POS')
    expect(headers).toContain('SN')
    expect(headers).toContain('MAC')
    expect(headers).toContain('IP')
    expect(headers).toContain('Status')
    expect(headers).toContain('Power Mode')
    expect(headers).toContain('Elapsed')
    expect(headers).toContain('Consumption')
    expect(headers).toContain('Hashrate')
    expect(headers).toContain('Efficiency')
    expect(headers).toContain('Pool Hashrate')
    expect(headers).toContain('FW Version')
  })

  it('should have CELL_MIN_WIDTH set for appropriate columns', () => {
    const columns = getMinerColumns(mockParams)
    const columnsWithMinSize = columns.filter((col) => col.minSize !== undefined)
    expect(columnsWithMinSize.length).toBeGreaterThan(5)
  })
})
