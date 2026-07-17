import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import _partial from "lodash/partial";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  CoreAlert,
  createFieldNames,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  FormSelect,
  FormTextArea,
} from "@primitives";

import { getOptionLabel } from "../get-option-label";
import type { BatchMoveSparePart, BatchMoveSparePartsModalProps } from "./batch-move-spare-parts-modal.types";
import "./batch-move-spare-parts-modal.scss";

const schema = z
  .object({
    location: z.string().nullable(),
    status: z.string().nullable(),
    observation: z.string().nullable(),
  })
  .refine((values) => values.location != null || values.status != null, {
    message: "Either location or status must be selected",
    path: ["location"],
  });

type FormValues = z.infer<typeof schema>;
const field = createFieldNames<FormValues>();

const columnHelper = createColumnHelper<BatchMoveSparePart>();

const buildColumns = (
  getLocationLabel: (value: string) => string,
  getStatusLabel: (value: string) => string,
) => [
  columnHelper.accessor("code", { header: "Code" }),
  columnHelper.accessor("location", {
    header: "Current Location",
    cell: (info) => getLocationLabel(info.getValue()),
  }),
  columnHelper.accessor("status", {
    header: "Current Status",
    cell: (info) => getStatusLabel(info.getValue()),
  }),
];

/**
 * Modal for moving multiple spare parts at once. Shows the selected parts in a table and lets the
 * user choose a new location and/or status plus an observation, applied to every part. Receives the
 * parts, option lists, and submit handler as props.
 *
 * @category dialogs
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const BatchMoveSparePartsModal = ({
  isOpen,
  onClose,
  spareParts,
  locationOptions,
  statusOptions,
  onSubmit,
}: BatchMoveSparePartsModalProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { location: null, status: null, observation: null },
  });

  const getLocationLabel = _partial(getOptionLabel, locationOptions);
  const getStatusLabel = _partial(getOptionLabel, statusOptions);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      location: values.location ?? null,
      status: values.status ?? null,
      observation: values.observation ?? null,
    });
    onClose();
  };

  const columns = buildColumns(getLocationLabel, getStatusLabel);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Batch Move Spare Parts"
        closable
        onClose={onClose}
        closeOnClickOutside={false}
        className="mdk-batch-move-spare-parts-modal"
      >
        <Form
          form={form}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mdk-batch-move-spare-parts-modal__form"
        >
          <DataTable data={spareParts} columns={columns} />
          <CoreAlert
            type="info"
            title="Bulk actions can take a few seconds to complete. Please do not submit other bulk actions until the previous one is completed."
          />
          <div className="mdk-batch-move-spare-parts-modal__fields">
            <FormSelect
              control={form.control}
              name={field("location")}
              placeholder="New Location"
              options={locationOptions}
            />
            <FormSelect
              control={form.control}
              name={field("status")}
              placeholder="New Status"
              options={statusOptions}
            />
            <FormTextArea
              control={form.control}
              name={field("observation")}
              placeholder="Please enter observations here"
              textAreaProps={{ rows: 3 }}
            />
          </div>
          <DialogFooter className="mdk-batch-move-spare-parts-modal__footer">
            <Button variant="outline" type="button" onClick={onClose} disabled={form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={form.formState.isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
