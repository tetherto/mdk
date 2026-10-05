import type { FormSelectOption } from '@primitives'

/** A spare part shown in the batch-move table. */
export type BatchMoveSparePart = {
  id: string
  code: string
  location: string
  status: string
}

/** Props for `BatchMoveSparePartsModal`; unselected location/status arrive as `null` on submit. */
export type BatchMoveSparePartsModalProps = {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal requests to close */
  onClose: VoidFunction
  /** The parts to move, rendered in the table */
  spareParts: BatchMoveSparePart[]
  /** New-location options */
  locationOptions: FormSelectOption[]
  /** New-status options */
  statusOptions: FormSelectOption[]
  /** Submit handler; unselected fields are `null` */
  onSubmit: (values: {
    location: string | null
    status: string | null
    observation: string | null
  }) => Promise<void> | void
}
