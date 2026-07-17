import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SparePartSubTypesModal } from "../spare-part-sub-types-modal";

const PART_TYPES = [
  { value: "type-controller", label: "Controller" },
  { value: "type-psu", label: "PSU" },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  partTypes: PART_TYPES,
  activePartTypeId: "type-controller",
  onPartTypeChange: vi.fn(),
  subTypes: ["CT-S19", "CT-S19j"],
  onAddSubType: vi.fn().mockResolvedValue(undefined),
};

describe("SparePartSubTypesModal", () => {
  it("renders subtype rows", () => {
    render(<SparePartSubTypesModal {...defaultProps} />);
    expect(screen.getByText("CT-S19")).toBeInTheDocument();
    expect(screen.getByText("CT-S19j")).toBeInTheDocument();
  });

  it("shows Add Item button by default", () => {
    render(<SparePartSubTypesModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
  });

  it("shows add form after clicking Add Item", () => {
    render(<SparePartSubTypesModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    expect(screen.getByPlaceholderText(/subtype name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument();
  });

  it("hides add form and shows Add Item button when cancel is clicked", () => {
    render(<SparePartSubTypesModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument();
    // Cancel returns to the normal state showing the Add Item button
    const cancelBtn = screen.getAllByRole("button", { name: /cancel/i })[0];
    fireEvent.click(cancelBtn!);
    expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
  });

  it("shows loader when isLoading is true", () => {
    render(<SparePartSubTypesModal {...defaultProps} isLoading />);
    expect(screen.queryByText("CT-S19")).not.toBeInTheDocument();
  });
});
