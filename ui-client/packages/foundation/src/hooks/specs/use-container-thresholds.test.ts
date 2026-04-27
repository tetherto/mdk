import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContainerThresholds } from '../use-container-thresholds'

// Mock dependencies
vi.mock('@/hooks/use-notification', () => ({
  useNotification: vi.fn(() => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
  })),
}))

vi.mock('@/utils/container-threshold-utils', () => ({
  findMatchingContainer: vi.fn(() => null),
  determineThresholdsToUse: vi.fn(() => ({
    oilTemperature: { criticalLow: 33, normal: 42 },
  })),
  shouldAutoSaveDefaults: vi.fn(() => false),
}))

describe('useContainerThresholds', () => {
  const mockData = {
    type: 'container-bd-d40',
    thresholds: { oilTemperature: { criticalLow: 33 } },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    expect(result.current.thresholds).toBeDefined()
    expect(result.current.isEditing).toBe(false)
    expect(result.current.isSaving).toBe(false)
  })

  it('handles threshold change', () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.handleThresholdChange('oilTemperature', 'criticalLow', 35)
    })

    expect(result.current.isEditing).toBe(true)
    expect(result.current.thresholds.oilTemperature).toEqual({ criticalLow: 35, normal: 42 })
  })

  it('handles threshold blur with auto-adjustment', () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.handleThresholdChange('oilTemperature', 'criticalLow', 33)
      result.current.handleThresholdChange('oilTemperature', 'normal', 42)
    })

    act(() => {
      result.current.handleThresholdBlur('oilTemperature', 'normal', '30')
    })

    // criticalLow should be adjusted down to not exceed normal
    const oilTemp = result.current.thresholds.oilTemperature as Record<string, number>
    expect(oilTemp.normal).toBe(30)
    expect(oilTemp.criticalLow).toBeLessThanOrEqual(30)
  })

  it('handles save successfully', async () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.handleThresholdChange('oilTemperature', 'criticalLow', 35)
    })

    await act(async () => {
      await result.current.handleSave()
    })

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false)
      expect(result.current.isEditing).toBe(false)
    })
  })

  it('handles save with custom onSave callback', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useContainerThresholds({ data: mockData, onSave }))

    act(() => {
      result.current.handleThresholdChange('oilTemperature', 'criticalLow', 35)
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(onSave).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'container-bd-d40',
        thresholds: expect.any(Object),
      }),
    })
  })

  it('handles reset', async () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.handleThresholdChange('oilTemperature', 'criticalLow', 35)
    })

    expect(result.current.isEditing).toBe(true)

    await act(async () => {
      await result.current.handleReset()
    })

    expect(result.current.isEditing).toBe(false)
  })

  it('updates parameters', () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.setParameters({ coolOilSetTemp: 40 })
    })

    expect(result.current.parameters).toEqual({ coolOilSetTemp: 40 })
  })

  it('updates isEditing state', () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.setIsEditing(true)
    })

    expect(result.current.isEditing).toBe(true)

    act(() => {
      result.current.setIsEditing(false)
    })

    expect(result.current.isEditing).toBe(false)
  })

  it('parses string values to numbers', () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.handleThresholdChange('oilTemperature', 'criticalLow', '35')
    })

    expect(result.current.thresholds.oilTemperature).toEqual({ criticalLow: 35, normal: 42 })
  })

  it('handles invalid number inputs', () => {
    const { result } = renderHook(() => useContainerThresholds({ data: mockData }))

    act(() => {
      result.current.handleThresholdChange('oilTemperature', 'criticalLow', 'invalid')
    })

    expect(result.current.thresholds.oilTemperature).toEqual({ criticalLow: 0, normal: 42 })
  })
})
