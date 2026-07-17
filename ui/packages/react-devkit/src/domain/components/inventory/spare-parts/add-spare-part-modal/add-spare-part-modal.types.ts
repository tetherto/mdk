import type { FormSelectOption } from "@primitives";

import type { SparePartSubTypesModalPartType } from "../spare-part-sub-types-modal/spare-part-sub-types-modal.types";

/** Values collected by the register-part form. Select fields are nullable until chosen. */
export type AddSparePartFormValues = {
  partTypeId: string;
  model: string | null;
  parentDeviceModel: string | null;
  serialNum: string;
  macAddress: string;
  status: string | null;
  location: string | null;
  comment: string;
  tags: string[];
};

/** Props for `AddSparePartModal`; option lists and handlers are supplied by the caller. */
export type AddSparePartModalProps = {
  isOpen: boolean;
  onClose: VoidFunction;
  partTypes: SparePartSubTypesModalPartType[];
  defaultPartTypeId?: string;
  modelOptions: FormSelectOption[];
  isModelOptionsLoading?: boolean;
  minerModelOptions: FormSelectOption[];
  statusOptions: FormSelectOption[];
  locationOptions: FormSelectOption[];
  isControllerPartTypeSelected?: boolean;
  onPartTypeChange: (partTypeId: string) => void;
  onSubmit: (
    values: AddSparePartFormValues,
  ) => Promise<{ fieldErrors?: Array<{ field: string; message: string }> } | void>;
  isLoading?: boolean;
  subTypesPartTypes?: SparePartSubTypesModalPartType[];
  subTypesActivePartTypeId?: string;
  subTypes?: string[];
  onSubTypesPartTypeChange?: (id: string) => void;
  onAddSubType?: (name: string) => Promise<{ error?: string } | void>;
  isSubTypesLoading?: boolean;
};
