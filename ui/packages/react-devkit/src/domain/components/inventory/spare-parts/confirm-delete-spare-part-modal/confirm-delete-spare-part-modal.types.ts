/** The spare part targeted for deletion. */
export type ConfirmDeleteSparePartModalSparePart = {
  id: string;
  code: string;
};

/** Props for `ConfirmDeleteSparePartModal`. */
export type ConfirmDeleteSparePartModalProps = {
  isOpen?: boolean;
  onClose?: VoidFunction;
  onConfirm?: (sparePart: ConfirmDeleteSparePartModalSparePart) => Promise<void> | void;
  sparePart?: ConfirmDeleteSparePartModalSparePart;
  isLoading?: boolean;
};
