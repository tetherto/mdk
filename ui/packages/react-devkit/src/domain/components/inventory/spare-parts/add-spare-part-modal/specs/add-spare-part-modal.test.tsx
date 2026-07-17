import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddSparePartModal } from "../add-spare-part-modal";
import { makeAddSparePartSchema } from "../add-spare-part-modal.schema";

const PART_TYPES = [
  { value: "inventory-miner_part-controller", label: "Controller" },
  { value: "inventory-miner_part-hashboard", label: "Hashboard" },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onPartTypeChange: vi.fn(),
  partTypes: PART_TYPES,
  modelOptions: [{ value: "CT-S19", label: "CT-S19" }],
  minerModelOptions: [{ value: "antminer-s19", label: "Antminer S19" }],
  statusOptions: [{ value: "ok_brand_new", label: "Brand New" }],
  locationOptions: [{ value: "site.warehouse", label: "Site Warehouse" }],
  isControllerPartTypeSelected: false,
};

describe("AddSparePartModal", () => {
  it("renders part type tabs", () => {
    render(<AddSparePartModal {...defaultProps} />);
    expect(screen.getByText("Controller")).toBeInTheDocument();
    expect(screen.getByText("Hashboard")).toBeInTheDocument();
  });

  it("shows MAC address field when controller part type selected", () => {
    render(<AddSparePartModal {...defaultProps} isControllerPartTypeSelected />);
    // FormInput renders placeholder="MAC Address" (no label, matching the reference app)
    expect(screen.getByPlaceholderText(/mac address/i)).toBeInTheDocument();
  });

  it("hides MAC address field when non-controller part type selected", () => {
    render(<AddSparePartModal {...defaultProps} isControllerPartTypeSelected={false} />);
    expect(screen.queryByPlaceholderText(/mac address/i)).not.toBeInTheDocument();
  });

  it("calls onPartTypeChange when tab is clicked", () => {
    const onPartTypeChange = vi.fn();
    render(<AddSparePartModal {...defaultProps} onPartTypeChange={onPartTypeChange} />);
    // Radix TabsTrigger activates on mouseDown (left click), not the synthetic click event
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Hashboard" }));
    expect(onPartTypeChange).toHaveBeenCalledWith("inventory-miner_part-hashboard");
  });

  it("shows loader when isLoading is true", () => {
    render(<AddSparePartModal {...defaultProps} isLoading />);
    expect(screen.queryByText("Serial Number")).not.toBeInTheDocument();
  });

  it("requires MAC address for controller — schema rejects empty macAddress", () => {
    const schema = makeAddSparePartSchema(true);
    const result = schema.safeParse({
      partTypeId: "inventory-miner_part-controller",
      model: "CT-S19",
      parentDeviceModel: "antminer-s19",
      serialNum: "",
      macAddress: "",
      status: "ok_brand_new",
      location: "site.warehouse",
      comment: "",
      tags: [],
    });
    expect(result.success).toBe(false);
    const macError = result.error?.issues.find((issue) => issue.path[0] === "macAddress");
    expect(macError?.message).toBe("MAC Address is required");
  });

  it("rejects an invalid MAC format for controller", () => {
    const schema = makeAddSparePartSchema(true);
    const result = schema.safeParse({
      partTypeId: "inventory-miner_part-controller",
      model: "CT-S19",
      parentDeviceModel: "antminer-s19",
      serialNum: "",
      macAddress: "not-a-mac",
      status: "ok_brand_new",
      location: "site.warehouse",
      comment: "",
      tags: [],
    });
    expect(result.success).toBe(false);
    const macError = result.error?.issues.find((issue) => issue.path[0] === "macAddress");
    expect(macError?.message).toMatch(/valid format/i);
  });

  it("requires serial number for non-controller — schema rejects empty serialNum", () => {
    const schema = makeAddSparePartSchema(false);
    const result = schema.safeParse({
      partTypeId: "inventory-miner_part-hashboard",
      model: "HB-S19",
      parentDeviceModel: "antminer-s19",
      serialNum: "",
      macAddress: "",
      status: "ok_brand_new",
      location: "site.warehouse",
      comment: "",
      tags: [],
    });
    expect(result.success).toBe(false);
    const serialError = result.error?.issues.find((issue) => issue.path[0] === "serialNum");
    expect(serialError?.message).toBe("Serial number is required");
  });

  it("does not require MAC address for non-controller", () => {
    const schema = makeAddSparePartSchema(false);
    const result = schema.safeParse({
      partTypeId: "inventory-miner_part-hashboard",
      model: "HB-S19",
      parentDeviceModel: "antminer-s19",
      serialNum: "SN-001",
      macAddress: "",
      status: "ok_brand_new",
      location: "site.warehouse",
      comment: "",
      tags: [],
    });
    expect(result.success).toBe(true);
  });

  it("blocks onSubmit when form is invalid (fieldErrors path requires all validation to pass)", async () => {
    const onSubmit = vi.fn();
    render(<AddSparePartModal {...defaultProps} isControllerPartTypeSelected onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    // Zod validation blocks submission when required fields are empty.
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });
});
