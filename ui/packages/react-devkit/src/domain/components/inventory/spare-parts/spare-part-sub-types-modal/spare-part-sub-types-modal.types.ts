/** A selectable part type shown as a tab in the subtypes modal. */
export type SparePartSubTypesModalPartType = {
  value: string
  label: string
}

/** Props for `SparePartSubTypesModal`; the active part type is controlled by the caller. */
export type SparePartSubTypesModalProps = {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal requests to close */
  onClose: VoidFunction
  /** Part-type tabs */
  partTypes: SparePartSubTypesModalPartType[]
  /** The selected part type (controlled by the parent) */
  activePartTypeId: string
  /** Called when the active tab changes (fetch that type's subtypes here) */
  onPartTypeChange: (id: string) => void
  /** Subtype names for the active part type */
  subTypes: string[]
  /** Add handler; return `{ error }` to surface a field error */
  onAddSubType: (name: string) => Promise<{ error?: string } | void>
  /** Renders a loader instead of the body */
  isLoading?: boolean
}
