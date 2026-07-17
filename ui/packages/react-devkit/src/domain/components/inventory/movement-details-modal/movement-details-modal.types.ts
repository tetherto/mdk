import type { ReactNode } from 'react'

/** Device record attached to a movement (e.g. a miner or spare part). All fields optional. */
export type MovementDevice = Partial<{
  code: string
  tags: string[]
  type: string
  info: Partial<{
    subType: string
    site: string
    container: string
    serialNum: string
    macAddress: string
  }>
}>

/** A single historical device movement: a location/status transition for one device. */
export type MovementData = {
  origin: string
  destination: string
  previousStatus: string
  newStatus: string
  device?: MovementDevice
  comments?: ReactNode
}

/** Props for `MovementDetailsModal`; pass the selected movement and open/close handlers. */
export type MovementDetailsModalProps = Partial<{
  isOpen: boolean
  onClose: () => void
  movement: MovementData
}>
