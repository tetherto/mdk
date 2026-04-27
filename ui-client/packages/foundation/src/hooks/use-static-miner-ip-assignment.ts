import { useEffect, useState } from 'react'

export type SelectedEditSocket = {
  containerInfo: {
    container?: string
  }
  socket: string
  pdu: string | number
}

export const useStaticMinerIpAssignment = (selectedEditSocket: Partial<SelectedEditSocket>) => {
  // MOCK: Replace this with useGetFeatureConfigQuery() later
  const [featureConfig] = useState({ isStaticIpAssignment: true })

  const isStaticIpAssignment = featureConfig?.isStaticIpAssignment
  const [minerIp, setMinerIp] = useState('')

  useEffect(() => {
    if (!isStaticIpAssignment || !selectedEditSocket) {
      setMinerIp('')
      return
    }

    // Native alternative to _split and _last
    // Assuming container format "CONT-01" -> "01"
    const containerParts = selectedEditSocket.containerInfo?.container?.split('-') || []
    const containerNumber = containerParts[containerParts.length - 1]

    // Assuming socket format "01_05" -> ["01", "05"]
    const socketPos = selectedEditSocket.socket?.split('_') || []
    const shelve = socketPos[0]
    const pos = socketPos[socketPos.length - 1]

    const pdu = selectedEditSocket.pdu

    // Validation: Ensure all parts exist and are not empty/NaN
    const parts = [containerNumber, pdu, shelve, pos]
    const hasInvalidPart = parts.some(
      (part) => part === undefined || part === '' || Number.isNaN(Number(part)),
    )

    if (hasInvalidPart) {
      setMinerIp('')
      return
    }

    // Construct IP: 10.[Container].[PDU].[Shelve][Pos]
    const ip = `10.${containerNumber}.${pdu}.${shelve}${pos}`
    setMinerIp(ip)
  }, [selectedEditSocket, isStaticIpAssignment])

  return { minerIp, setMinerIp, isStaticIpAssignment }
}
