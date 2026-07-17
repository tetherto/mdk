import { Button, Dialog, DialogContent, DialogFooter } from "@primitives";

import type { ConfirmDeleteSparePartModalProps } from "./confirm-delete-spare-part-modal.types";
import "./confirm-delete-spare-part-modal.scss";

/**
 * Confirmation modal for deleting a spare part. Warns that the action is irreversible and surfaces
 * the part code so the user can verify before confirming. Receives the part and confirm handler as
 * props.
 *
 * @category dialogs
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const ConfirmDeleteSparePartModal = ({
  isOpen,
  onClose,
  onConfirm,
  sparePart,
  isLoading,
}: ConfirmDeleteSparePartModalProps) => {
  if (!sparePart) return null;

  const handleConfirm = async () => {
    await onConfirm?.(sparePart);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        title="Delete spare part"
        closable
        onClose={onClose}
        closeOnClickOutside={false}
        className="mdk-confirm-delete-spare-part-modal"
      >
        <p className="mdk-confirm-delete-spare-part-modal__message">
          Are you sure you want to delete the spare part with code: {sparePart.code}? This action is
          irreversible and all data associated to the device will be deleted.
        </p>
        <DialogFooter className="mdk-confirm-delete-spare-part-modal__footer">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={isLoading}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
