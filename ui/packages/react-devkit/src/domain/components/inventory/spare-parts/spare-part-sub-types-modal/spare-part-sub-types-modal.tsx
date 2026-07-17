import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import _map from "lodash/map";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  createFieldNames,
  DataTable,
  Dialog,
  DialogContent,
  Form,
  FormInput,
  Loader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@primitives";

import type { DataTableColumnDef } from "@primitives";

import type { SparePartSubTypesModalProps } from "./spare-part-sub-types-modal.types";
import "./spare-part-sub-types-modal.scss";

const addSubTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type AddSubTypeValues = z.infer<typeof addSubTypeSchema>;
const field = createFieldNames<AddSubTypeValues>();

type SubTypeRow = { name: string };

const columns: DataTableColumnDef<SubTypeRow, unknown>[] = [
  { accessorKey: "name", header: "Subtype Name" },
];

/**
 * Modal for viewing and adding spare part subtypes per part type. Presents a part-type tab strip, a
 * table of existing subtypes for the active type, and an inline add form. Receives the active part
 * type, subtype list, and add handler as props.
 *
 * @category dialogs
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const SparePartSubTypesModal = ({
  isOpen,
  onClose,
  partTypes,
  activePartTypeId,
  onPartTypeChange,
  subTypes,
  onAddSubType,
  isLoading,
}: SparePartSubTypesModalProps) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const form = useForm<AddSubTypeValues>({
    resolver: zodResolver(addSubTypeSchema),
    defaultValues: { name: "" },
  });

  const handleSubmit = async (values: AddSubTypeValues) => {
    const result = await onAddSubType(values.name);
    if (result?.error) {
      form.setError("name", { message: result.error });
      return;
    }
    form.reset();
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    form.reset();
    setShowAddForm(false);
  };

  const subTypesData: SubTypeRow[] = _map(subTypes, (name) => ({ name }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Spare Part Subtypes"
        closable
        onClose={onClose}
        closeOnClickOutside={false}
        className="mdk-spare-part-sub-types-modal"
      >
        {isLoading ? (
          <Loader />
        ) : (
          <div className="mdk-spare-part-sub-types-modal__body">
            <Tabs variant="underline" value={activePartTypeId} onValueChange={onPartTypeChange}>
              <TabsList variant="underline">
                {partTypes.map((partType) => (
                  <TabsTrigger key={partType.value} variant="underline" value={partType.value}>
                    {partType.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {partTypes.map((partType) => (
                <TabsContent key={partType.value} value={partType.value}>
                  <DataTable data={subTypesData} columns={columns} />
                </TabsContent>
              ))}
            </Tabs>

            {showAddForm ? (
              <Form
                form={form}
                onSubmit={form.handleSubmit(handleSubmit)}
                className="mdk-spare-part-sub-types-modal__add-form"
              >
                <div className="mdk-spare-part-sub-types-modal__add-row">
                  <FormInput
                    control={form.control}
                    name={field("name")}
                    placeholder="Subtype Name"
                    disabled={form.formState.isSubmitting}
                  />
                  <div className="mdk-spare-part-sub-types-modal__add-actions">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleCancelAdd}
                      disabled={form.formState.isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Form>
            ) : (
              <Button
                className="mdk-spare-part-sub-types-modal__add-btn"
                variant="primary"
                onClick={() => setShowAddForm(true)}
              >
                Add Item
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
