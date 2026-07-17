import type { FormSelectOption } from "@primitives";

/** A spare part shown in the batch-move table. */
export type BatchMoveSparePart = {
  id: string;
  code: string;
  location: string;
  status: string;
};

/** Props for `BatchMoveSparePartsModal`; unselected location/status arrive as `null` on submit. */
export type BatchMoveSparePartsModalProps = {
  isOpen: boolean;
  onClose: VoidFunction;
  spareParts: BatchMoveSparePart[];
  locationOptions: FormSelectOption[];
  statusOptions: FormSelectOption[];
  onSubmit: (values: {
    location: string | null;
    status: string | null;
    observation: string | null;
  }) => Promise<void> | void;
};
