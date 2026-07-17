/** A selectable part type shown as a tab in the subtypes modal. */
export type SparePartSubTypesModalPartType = {
  value: string;
  label: string;
};

/** Props for `SparePartSubTypesModal`; the active part type is controlled by the caller. */
export type SparePartSubTypesModalProps = {
  isOpen: boolean;
  onClose: VoidFunction;
  partTypes: SparePartSubTypesModalPartType[];
  activePartTypeId: string;
  onPartTypeChange: (id: string) => void;
  subTypes: string[];
  onAddSubType: (name: string) => Promise<{ error?: string } | void>;
  isLoading?: boolean;
};
