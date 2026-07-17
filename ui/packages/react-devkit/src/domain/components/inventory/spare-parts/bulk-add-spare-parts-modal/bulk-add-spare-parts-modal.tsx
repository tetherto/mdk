import { useState } from "react";

import { TrashIcon, UploadIcon } from "@radix-ui/react-icons";

import { Button, CoreAlert, Dialog, DialogContent, DialogFooter, Loader } from "@primitives";

import { downloadCsvTemplate } from "./bulk-add-spare-parts-modal.utils";
import { useBulkCsvUpload } from "./use-bulk-csv-upload";
import type { BulkAddSparePartsModalProps } from "./bulk-add-spare-parts-modal.types";
import "./bulk-add-spare-parts-modal.scss";

/**
 * Modal for bulk-adding spare parts from a CSV file. Provides a CSV template download, file
 * selection with client-side parsing, and submits the parsed records. Receives the submit handler
 * as a prop; CSV parsing and validation helpers are exported alongside the component.
 *
 * @category dialogs
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const BulkAddSparePartsModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: BulkAddSparePartsModalProps) => {
  const { records, fileName, uploadError, inputRef, handleFileChange, handleRemove } =
    useBulkCsvUpload(isOpen);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeError = uploadError ?? submitError;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!records.length) {
      setSubmitError("Please upload a CSV file");
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await onSubmit(records);
      if (result?.error) {
        setSubmitError(result.error);
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Bulk add parts"
        closable
        onClose={onClose}
        closeOnClickOutside={false}
        className="mdk-bulk-add-spare-parts-modal"
      >
        {isLoading ? (
          <Loader />
        ) : (
          <form onSubmit={handleSubmit} className="mdk-bulk-add-spare-parts-modal__form">
            <CoreAlert type="info" title="Bulk actions can take a few seconds to complete" />

            <div className="mdk-bulk-add-spare-parts-modal__upload">
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="mdk-bulk-add-spare-parts-modal__file-input"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
              <Button
                variant="secondary"
                type="button"
                icon={<UploadIcon />}
                disabled={isSubmitting}
                onClick={() => inputRef.current?.click()}
              >
                Click to select CSV
              </Button>

              {fileName && (
                <div className="mdk-bulk-add-spare-parts-modal__file-row">
                  <span className="mdk-bulk-add-spare-parts-modal__file-info">
                    <span className="mdk-bulk-add-spare-parts-modal__file-icon">📎</span>
                    <span className="mdk-bulk-add-spare-parts-modal__file-name">{fileName}</span>
                  </span>
                  <Button
                    variant="icon"
                    type="button"
                    icon={<TrashIcon />}
                    aria-label="Remove file"
                    onClick={handleRemove}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <Button variant="link" type="button" onClick={() => downloadCsvTemplate()}>
                Download CSV template
              </Button>
            </div>

            {activeError && <CoreAlert type="error" title={activeError} />}

            <DialogFooter className="mdk-bulk-add-spare-parts-modal__footer">
              <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={!records.length || isSubmitting}
              >
                Upload
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
