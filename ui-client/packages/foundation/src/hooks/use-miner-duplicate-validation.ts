import { useState } from 'react'
import type { MinerValidationData } from './hooks-types'

// Temporary mock data to simulate existing devices in the system
const MOCK_MINERS_DB = [
  {
    id: 'miner-1',
    code: 'M-001',
    info: { macAddress: 'AA:BB:CC:DD:EE:FF', serialNum: 'SN12345' },
    opts: { address: '192.168.1.10' },
  },
  {
    id: 'miner-2',
    code: 'M-002',
    info: { macAddress: '11:22:33:44:55:66', serialNum: 'SN67890' },
    opts: { address: '192.168.1.11' },
  },
]

export const useMinerDuplicateValidation = () => {
  const [isDuplicateCheckLoading, setIsDuplicateCheckLoading] = useState(false)
  const [duplicateError, setDuplicateError] = useState(false)

  const checkDuplicate = async (
    selectedEditSocket: { miner?: { id?: string } } | null,
    { macAddress, serialNumber, address, code }: MinerValidationData,
  ): Promise<boolean> => {
    setIsDuplicateCheckLoading(true)

    // Simulate network latency
    return new Promise((resolve) => {
      setTimeout(() => {
        // Search through mock data for any field match
        const foundDuplicate = MOCK_MINERS_DB.find((item) => {
          // Rule: If we are editing an existing miner, ignore it in the search
          if (item.id === selectedEditSocket?.miner?.id) return false

          return (
            (macAddress && item.info.macAddress.toLowerCase() === macAddress.toLowerCase()) ||
            (serialNumber && item.info.serialNum === serialNumber) ||
            (address && item.opts.address === address) ||
            (code && item.code === code)
          )
        })

        const hasError = !!foundDuplicate
        setDuplicateError(hasError)
        setIsDuplicateCheckLoading(false)
        resolve(hasError)
      }, 600) // 600ms fake delay
    })
  }

  return {
    duplicateError,
    isDuplicateCheckLoading,
    checkDuplicate,
    setDuplicateError,
  }
}
