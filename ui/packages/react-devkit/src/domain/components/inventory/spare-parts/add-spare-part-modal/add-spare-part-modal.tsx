import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  Button,
  createFieldNames,
  Dialog,
  DialogContent,
  Form,
  FormInput,
  FormSelect,
  FormTagInput,
  FormTextArea,
  Loader,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@primitives";

import { SparePartSubTypesModal } from "../spare-part-sub-types-modal/spare-part-sub-types-modal";
import { makeAddSparePartSchema } from "./add-spare-part-modal.schema";
import type { AddSparePartFormValues, AddSparePartModalProps } from "./add-spare-part-modal.types";
import "./add-spare-part-modal.scss";

type FormValues = z.infer<ReturnType<typeof makeAddSparePartSchema>>;
const field = createFieldNames<FormValues>();

/**
 * Modal for registering a new spare part. Presents a part-type tab strip and a form for miner
 * model, part model, serial number, MAC address (controllers only), status, location, tags, and a
 * comment. Validation is controller-aware: controllers require a MAC address, other parts require a
 * serial number. Receives option lists and the submit handler as props.
 *
 * @category dialogs
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const AddSparePartModal = ({
  isOpen,
  onClose,
  partTypes,
  defaultPartTypeId,
  modelOptions,
  isModelOptionsLoading,
  minerModelOptions,
  statusOptions,
  locationOptions,
  isControllerPartTypeSelected,
  onPartTypeChange,
  onSubmit,
  isLoading,
  subTypesPartTypes,
  subTypesActivePartTypeId,
  subTypes,
  onSubTypesPartTypeChange,
  onAddSubType,
  isSubTypesLoading,
}: AddSparePartModalProps) => {
  const [subTypesOpen, setSubTypesOpen] = useState(false);

  const schema = useMemo(() => makeAddSparePartSchema(!!isControllerPartTypeSelected), [isControllerPartTypeSelected]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      partTypeId: defaultPartTypeId ?? partTypes[0]?.value ?? "",
      model: "",
      parentDeviceModel: "",
      serialNum: "",
      macAddress: "",
      status: "",
      location: "",
      comment: "",
      tags: [],
    },
  });

  useEffect(() => {
    const target = defaultPartTypeId ?? partTypes[0]?.value;
    if (target && !form.getValues("partTypeId")) {
      form.setValue("partTypeId", target);
    }
  }, [defaultPartTypeId, partTypes, form]);

  const handlePartTypeChange = (value: string) => {
    form.setValue("partTypeId", value);
    form.setValue("model", "");
    form.clearErrors(["serialNum", "macAddress"]);
    onPartTypeChange(value);
  };

  const handleSubmit = async (values: FormValues) => {
    const result = await onSubmit(values as AddSparePartFormValues);
    if (result?.fieldErrors) {
      result.fieldErrors.forEach(({ field: fieldName, message }) => {
        form.setError(fieldName as keyof FormValues, { message });
      });
    }
  };

  const activePartTypeId = form.watch("partTypeId");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          title="Register Part"
          closable
          onClose={onClose}
          closeOnClickOutside={false}
          className="mdk-add-spare-part-modal"
        >
          {isLoading ? (
            <Loader />
          ) : (
            <Form
              form={form}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="mdk-add-spare-part-modal__form"
            >
              <Tabs variant="underline" value={activePartTypeId} onValueChange={handlePartTypeChange}>
                <TabsList variant="underline">
                  {partTypes.map((partType) => (
                    <TabsTrigger key={partType.value} variant="underline" value={partType.value}>
                      {partType.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="mdk-add-spare-part-modal__fields">
                <FormSelect
                  control={form.control}
                  name={field("parentDeviceModel")}
                  placeholder="Select miner model"
                  options={minerModelOptions}
                />
                <FormSelect
                  control={form.control}
                  name={field("model")}
                  placeholder="Select part model"
                  options={modelOptions}
                  disabled={isModelOptionsLoading}
                />
                <FormInput
                  control={form.control}
                  name={field("serialNum")}
                  placeholder="Serial Number"
                />
                {isControllerPartTypeSelected && (
                  <FormInput
                    control={form.control}
                    name={field("macAddress")}
                    placeholder="MAC Address"
                  />
                )}
                <FormSelect
                  control={form.control}
                  name={field("status")}
                  placeholder="Select status"
                  options={statusOptions}
                />
                <FormSelect
                  control={form.control}
                  name={field("location")}
                  placeholder="Select location"
                  options={locationOptions}
                />
                <FormTagInput
                  control={form.control}
                  name={field("tags")}
                  placeholder="Add tags"
                  options={[]}
                />
                <FormTextArea
                  control={form.control}
                  name={field("comment")}
                  placeholder="Comment"
                  textAreaProps={{ rows: 4 }}
                />
              </div>

              <div className="mdk-add-spare-part-modal__footer">
                {subTypesPartTypes && (
                  <Button variant="secondary" type="button" onClick={() => setSubTypesOpen(true)}>
                    View Subtypes
                  </Button>
                )}
                <div className="mdk-add-spare-part-modal__actions">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={onClose}
                    disabled={form.formState.isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={form.formState.isSubmitting}>
                    Save
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {subTypesOpen && subTypesPartTypes && (
        <SparePartSubTypesModal
          isOpen={subTypesOpen}
          onClose={() => setSubTypesOpen(false)}
          partTypes={subTypesPartTypes}
          activePartTypeId={subTypesActivePartTypeId ?? subTypesPartTypes[0]?.value ?? ""}
          onPartTypeChange={onSubTypesPartTypeChange ?? (() => {})}
          subTypes={subTypes ?? []}
          onAddSubType={onAddSubType ?? (() => Promise.resolve())}
          isLoading={isSubTypesLoading}
        />
      )}
    </>
  );
};
