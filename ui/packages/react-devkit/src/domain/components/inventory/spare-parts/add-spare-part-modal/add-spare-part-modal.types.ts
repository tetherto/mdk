import type { FormSelectOption } from '@primitives'

import type { SparePartSubTypesModalPartType } from '../spare-part-sub-types-modal/spare-part-sub-types-modal.types'

/** Values collected by the register-part form. Select fields are nullable until chosen. */
export type AddSparePartFormValues = {
  partTypeId: string
  model: string | null
  parentDeviceModel: string | null
  serialNum: string
  macAddress: string
  status: string | null
  location: string | null
  comment: string
  tags: string[]
}

/** Props for `AddSparePartModal`; option lists and handlers are supplied by the caller. */
export type AddSparePartModalProps = {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal requests to close */
  onClose: VoidFunction
  /** Part-type tabs */
  partTypes: SparePartSubTypesModalPartType[]
  /** Initially selected part type */
  defaultPartTypeId?: string
  /** Part model options for the active part type */
  modelOptions: FormSelectOption[]
  /** Disables the model select while options load */
  isModelOptionsLoading?: boolean
  /** Parent miner model options */
  minerModelOptions: FormSelectOption[]
  /** Status options */
  statusOptions: FormSelectOption[]
  /** Location options */
  locationOptions: FormSelectOption[]
  /** When true, the MAC address field is shown and required */
  isControllerPartTypeSelected?: boolean
  /** Called when the active part type changes (refetch model options here) */
  onPartTypeChange: (partTypeId: string) => void
  /** Submit handler; return `fieldErrors` to surface server-side validation */
  onSubmit: (
    values: AddSparePartFormValues,
  ) => Promise<{ fieldErrors?: Array<{ field: string; message: string }> } | void>
  /** Renders a loader instead of the form */
  isLoading?: boolean
  /** Part types for the embedded "View Subtypes" modal */
  subTypesPartTypes?: SparePartSubTypesModalPartType[]
  /** Active part type for the embedded subtypes modal */
  subTypesActivePartTypeId?: string
  /** Subtype names for the active part type in the embedded modal */
  subTypes?: string[]
  /** Called when the active tab changes in the embedded subtypes modal */
  onSubTypesPartTypeChange?: (id: string) => void
  /** Add handler for the embedded subtypes modal; return `{ error }` to surface a field error */
  onAddSubType?: (name: string) => Promise<{ error?: string } | void>
  /** Loading state for the embedded subtypes modal */
  isSubTypesLoading?: boolean
}
