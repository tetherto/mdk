import type { CSVRecord } from "./bulk-add-spare-parts-modal.utils";

/** Props for `BulkAddSparePartsModal`; `onSubmit` receives the parsed CSV records. */
export type BulkAddSparePartsModalProps = {
  isOpen: boolean;
  onClose: VoidFunction;
  onSubmit: (records: CSVRecord[]) => Promise<{ error?: string } | void>;
  isLoading?: boolean;
};
