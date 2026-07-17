import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import _isEqual from "lodash/isEqual";
import _omit from "lodash/omit";
import _partial from "lodash/partial";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  createFieldNames,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  FormSelect,
  FormTextArea,
} from "@primitives";

import {
  SPARE_PART_LOCATION_BG_COLORS,
  SPARE_PART_STATUS_BG_COLORS,
} from "../../../../constants/spare-parts-constants";
import { getOptionLabel } from "../get-option-label";
import { STEP } from "./move-spare-part-modal.constants";
import type { MoveSparePartModalProps } from "./move-spare-part-modal.types";
import { SparePartDetails } from "./spare-part-details";
import "./move-spare-part-modal.scss";

const getStatusStyle = (status: string): CSSProperties => ({
  backgroundColor: SPARE_PART_STATUS_BG_COLORS[status],
});

const getLocationStyle = (location: string): CSSProperties => ({
  backgroundColor: SPARE_PART_LOCATION_BG_COLORS[location],
});

const schema = z.object({
  location: z.string().min(1, "Location is required"),
  status: z.string().min(1, "Status is required"),
  observation: z.string(),
});

type FormValues = z.infer<typeof schema>;
const field = createFieldNames<FormValues>();

/**
 * Two-step modal for moving a single spare part. Step one shows the part details with its current
 * location and status and lets the user pick a new location, status, and observation; step two
 * previews the before → after transition for confirmation. Receives the part, option lists, and
 * submit handler as props.
 *
 * @category dialogs
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const MoveSparePartModal = ({
  isOpen,
  onClose,
  sparePart,
  requestedValues,
  locationOptions,
  statusOptions,
  onSubmit,
}: MoveSparePartModalProps) => {
  const [step, setStep] = useState<typeof STEP[keyof typeof STEP]>(STEP.ONE);

  const initialValues: FormValues = sparePart
    ? {
        location: requestedValues?.location ?? sparePart.location,
        status: requestedValues?.status ?? sparePart.status,
        observation: "",
      }
    : { location: "", status: "", observation: "" };

  const currentValues: FormValues = sparePart
    ? { location: sparePart.location, status: sparePart.status, observation: "" }
    : { location: "", status: "", observation: "" };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (!isOpen) {
      setStep(STEP.ONE);
      form.reset(
        sparePart
          ? {
              location: requestedValues?.location ?? sparePart.location,
              status: requestedValues?.status ?? sparePart.status,
              observation: "",
            }
          : { location: "", status: "", observation: "" },
      );
    }
  }, [isOpen, sparePart, requestedValues, form]);

  const formValues = form.watch();
  const valuesChanged = !_isEqual(_omit(formValues, ["observation"]), _omit(currentValues, ["observation"]));

  const handleStep1Confirm = async () => {
    const valid = await form.trigger(["location", "status"]);
    if (valid) setStep(STEP.TWO);
  };

  const handleCancel = () => {
    form.reset(currentValues);
    setStep(STEP.ONE);
  };

  const handleSubmit = async (values: FormValues) => {
    if (!sparePart) return;
    await onSubmit(values, sparePart);
    onClose?.();
  };

  const getLocationLabel = _partial(getOptionLabel, locationOptions);
  const getStatusLabel = _partial(getOptionLabel, statusOptions);

  if (!sparePart) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        title="Device Updates > Move Spare Part"
        closable
        onClose={onClose}
        closeOnClickOutside={false}
        className="mdk-move-spare-part-modal"
      >
        <div className="mdk-move-spare-part-modal__status-section">
          <div className="mdk-move-spare-part-modal__left-panel">
            <SparePartDetails sparePart={sparePart} />
          </div>
          <div className="mdk-move-spare-part-modal__right-panel">
            {step === STEP.ONE && (
              <div className="mdk-move-spare-part-modal__current-state">
                <div className="mdk-move-spare-part-modal__state-field">
                  <span className="mdk-move-spare-part-modal__state-label">Current Location:</span>
                  <span className="mdk-move-spare-part-modal__state-value" style={getLocationStyle(sparePart.location)}>
                    {getLocationLabel(sparePart.location)}
                  </span>
                </div>
                <div className="mdk-move-spare-part-modal__state-field">
                  <span className="mdk-move-spare-part-modal__state-label">Current Status:</span>
                  <span className="mdk-move-spare-part-modal__state-value" style={getStatusStyle(sparePart.status)}>
                    {getStatusLabel(sparePart.status)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {step === STEP.TWO && (
          <div className="mdk-move-spare-part-modal__preview">
            <div className="mdk-move-spare-part-modal__preview-side">
              <div className="mdk-move-spare-part-modal__state-field">
                <span className="mdk-move-spare-part-modal__state-label">Current Location:</span>
                <span className="mdk-move-spare-part-modal__state-value" >
                  {getLocationLabel(sparePart.location)}
                </span>
              </div>
              <div className="mdk-move-spare-part-modal__state-field">
                <span className="mdk-move-spare-part-modal__state-label">Current Status:</span>
                <span className="mdk-move-spare-part-modal__state-value" style={getStatusStyle(sparePart.status)}>
                  {getStatusLabel(sparePart.status)}
                </span>
              </div>
            </div>
            <span className="mdk-move-spare-part-modal__arrow">→</span>
            <div className="mdk-move-spare-part-modal__preview-side">
              <div className="mdk-move-spare-part-modal__state-field">
                <span className="mdk-move-spare-part-modal__state-label">New Location:</span>
                <span className="mdk-move-spare-part-modal__state-value" style={getLocationStyle(formValues.location)}>
                  {getLocationLabel(formValues.location)}
                </span>
              </div>
              <div className="mdk-move-spare-part-modal__state-field">
                <span className="mdk-move-spare-part-modal__state-label">New Status:</span>
                <span className="mdk-move-spare-part-modal__state-value" style={getStatusStyle(formValues.status)}>
                  {getStatusLabel(formValues.status)}
                </span>
              </div>
            </div>
          </div>
        )}

        <Form
          form={form}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mdk-move-spare-part-modal__form"
        >
          {step === STEP.ONE && (
            <div className="mdk-move-spare-part-modal__form-body">
              <p className="mdk-move-spare-part-modal__form-header">Move Spare Part to</p>
              <div className="mdk-move-spare-part-modal__target-fields">
                <div className="mdk-move-spare-part-modal__field-group">
                  <span>New Location</span>
                  <FormSelect
                    control={form.control}
                    name={field("location")}
                    options={locationOptions}
                  />
                </div>
                <div className="mdk-move-spare-part-modal__field-group">
                  <span>New Status</span>
                  <FormSelect
                    control={form.control}
                    name={field("status")}
                    options={statusOptions}
                  />
                </div>
              </div>
              <FormTextArea
                control={form.control}
                name={field("observation")}
                placeholder="Please enter observations here"
                textAreaProps={{ rows: 3 }}
              />
              {valuesChanged ? (
                <DialogFooter className="mdk-move-spare-part-modal__form-footer">
                  <Button variant="primary" type="button" onClick={handleStep1Confirm}>
                    Save Changes
                  </Button>
                </DialogFooter>
              ) : (
                <p className="mdk-move-spare-part-modal__no-changes">No Changes made</p>
              )}
            </div>
          )}

          {step === STEP.TWO && (
            <div className="mdk-move-spare-part-modal__form-body">
              <FormTextArea
                control={form.control}
                name={field("observation")}
                placeholder="Please enter observations here"
                textAreaProps={{ rows: 3 }}
              />
              <p className="mdk-move-spare-part-modal__confirm-text">Are you sure?</p>
              <DialogFooter className="mdk-move-spare-part-modal__form-footer">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCancel}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  Request Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
};
