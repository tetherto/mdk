import type { CSVRecord } from './bulk-add-spare-parts-modal.utils'

/** Props for `BulkAddSparePartsModal`; `onSubmit` receives the parsed CSV records. */
export type BulkAddSparePartsModalProps = {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal requests to close */
  onClose: VoidFunction
  /** Submit handler; return `{ error }` to show an inline error */
  onSubmit: (records: CSVRecord[]) => Promise<{ error?: string } | void>
  /** Renders a loader instead of the form */
  isLoading?: boolean
}
