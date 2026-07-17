import type { FormSelectOption } from "@primitives";

/** A spare part's display attributes, rendered by `SparePartDetails`. Extra keys are allowed. */
export type SparePartDetailsRecord = {
  code?: string;
  type?: string;
  site?: string;
  serialNum?: string;
  macAddress?: string;
  [key: string]: unknown;
};

/** Props for `SparePartDetails`. */
export type SparePartDetailsProps = {
  sparePart?: SparePartDetailsRecord;
};

/** A spare part being moved: its display attributes plus current location and status. */
export type MoveSparePartModalSparePart = SparePartDetailsRecord & {
  id: string;
  location: string;
  status: string;
};

/** Props for `MoveSparePartModal`. */
export type MoveSparePartModalProps = {
  isOpen?: boolean;
  onClose?: VoidFunction;
  sparePart?: MoveSparePartModalSparePart;
  requestedValues?: { location?: string; status?: string };
  locationOptions: FormSelectOption[];
  statusOptions: FormSelectOption[];
  onSubmit: (
    values: { location: string; status: string; observation: string },
    sparePart: MoveSparePartModalSparePart,
  ) => Promise<void> | void;
};
