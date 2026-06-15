import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useStaticMinerIpAssignment } from '../use-static-miner-ip-assignment'

describe('useStaticMinerIpAssignment', () => {
  it('should initialize with an empty string if no socket is provided', () => {
    const { result } = renderHook(() => useStaticMinerIpAssignment(undefined))

    expect(result.current.minerIp).toBe('')
    expect(result.current.isStaticIpAssignment).toBe(true)
  })

  it('should correctly construct a static IP from valid socket data', () => {
    const selectedEditSocket = {
      containerInfo: { container: 'CONT-01' },
      socket: '02_05',
      pdu: '10',
    }

    const { result } = renderHook(() => useStaticMinerIpAssignment(selectedEditSocket))

    // Logic: 10.[Container: 01].[PDU: 10].[Shelve: 02][Pos: 05]
    expect(result.current.minerIp).toBe('10.01.10.0205')
  })

  it('should handle numeric PDU values', () => {
    const selectedEditSocket = {
      containerInfo: { container: 'UNIT-99' },
      socket: '1_8',
      pdu: 5,
    }

    const { result } = renderHook(() => useStaticMinerIpAssignment(selectedEditSocket))

    expect(result.current.minerIp).toBe('10.99.5.18')
  })

  it('should return empty string if container format is invalid', () => {
    const selectedEditSocket = {
      containerInfo: { container: '' }, // No number to extract
      socket: '01_01',
      pdu: '1',
    }

    const { result } = renderHook(() => useStaticMinerIpAssignment(selectedEditSocket))

    expect(result.current.minerIp).toBe('')
  })

  it('should return empty string if PDU is not a valid number', () => {
    const selectedEditSocket = {
      containerInfo: { container: 'C-01' },
      socket: '01_05',
      pdu: 'NotANumber',
    }

    const { result } = renderHook(() => useStaticMinerIpAssignment(selectedEditSocket))

    expect(result.current.minerIp).toBe('')
  })

  it('should update the IP when the socket changes', () => {
    const { result, rerender } = renderHook(({ socket }) => useStaticMinerIpAssignment(socket), {
      initialProps: {
        socket: {
          containerInfo: { container: 'C-01' },
          socket: '01_01',
          pdu: '1',
        },
      },
    })

    expect(result.current.minerIp).toBe('10.01.1.0101')

    // Rerender with new props
    rerender({
      socket: {
        containerInfo: { container: 'C-02' },
        socket: '02_02',
        pdu: '2',
      },
    })

    expect(result.current.minerIp).toBe('10.02.2.0202')
  })
})
