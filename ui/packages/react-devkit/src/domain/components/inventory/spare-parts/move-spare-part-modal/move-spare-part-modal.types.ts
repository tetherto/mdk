import type { FormSelectOption } from '@primitives'

/** A spare part's display attributes, rendered by `SparePartDetails`. Extra keys are allowed. */
export type SparePartDetailsRecord = {
  code?: string
  type?: string
  site?: string
  serialNum?: string
  macAddress?: string
  [key: string]: unknown
}

/** Props for `SparePartDetails`. */
export type SparePartDetailsProps = {
  sparePart?: SparePartDetailsRecord
}

/** A spare part being moved: its display attributes plus current location and status. */
export type MoveSparePartModalSparePart = SparePartDetailsRecord & {
  id: string
  location: string
  status: string
}

/** Props for `MoveSparePartModal`. */
export type MoveSparePartModalProps = {
  /** Whether the modal is open */
  isOpen?: boolean
  /** Called when the modal requests to close */
  onClose?: VoidFunction
  /** The part to move; when omitted the modal renders nothing */
  sparePart?: MoveSparePartModalSparePart
  /** Pre-seeds the target location/status */
  requestedValues?: { location?: string; status?: string }
  /** Location options */
  locationOptions: FormSelectOption[]
  /** Status options */
  statusOptions: FormSelectOption[]
  /** Submit handler with the new `{ location, status, observation }` and the original part */
  onSubmit: (
    values: { location: string; status: string; observation: string },
    sparePart: MoveSparePartModalSparePart,
  ) => Promise<void> | void
}
