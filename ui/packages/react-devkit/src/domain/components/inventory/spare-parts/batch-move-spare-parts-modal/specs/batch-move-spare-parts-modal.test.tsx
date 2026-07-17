import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BatchMoveSparePartsModal } from "../batch-move-spare-parts-modal";

const locationOptions = [
  { value: "site.warehouse", label: "Site Warehouse" },
  { value: "workshop.warehouse", label: "Workshop Warehouse" },
];

const statusOptions = [
  { value: "ok_brand_new", label: "Brand New" },
  { value: "faulty", label: "Faulty" },
];

const mockSpareParts = [
  { id: "sp-001", code: "HB-A001", location: "site.warehouse", status: "ok_brand_new" },
  { id: "sp-002", code: "HB-A002", location: "workshop.warehouse", status: "faulty" },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  spareParts: mockSpareParts,
  locationOptions,
  statusOptions,
};

describe("BatchMoveSparePartsModal", () => {
  it("renders spare part codes in the table", () => {
    render(<BatchMoveSparePartsModal {...defaultProps} />);
    expect(screen.getByText("HB-A001")).toBeInTheDocument();
    expect(screen.getByText("HB-A002")).toBeInTheDocument();
  });

  it("renders current location and status column headers", () => {
    render(<BatchMoveSparePartsModal {...defaultProps} />);
    expect(screen.getByText("Current Location")).toBeInTheDocument();
    expect(screen.getByText("Current Status")).toBeInTheDocument();
  });

  it("renders select fields for new location and new status", () => {
    render(<BatchMoveSparePartsModal {...defaultProps} />);
    // FormSelect renders as combobox elements — two selects: location and status
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(<BatchMoveSparePartsModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("resolves current location/status cells to their option labels", () => {
    render(<BatchMoveSparePartsModal {...defaultProps} />);
    // Labels (not raw keys) prove the column cell renderers ran.
    expect(screen.getAllByText("Workshop Warehouse").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brand New").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Faulty").length).toBeGreaterThan(0);
  });

  it("falls back to the raw value when a cell value has no matching option", () => {
    const parts = [{ id: "sp-x", code: "X-1", location: "unmapped.loc", status: "unmapped_status" }];
    render(<BatchMoveSparePartsModal {...defaultProps} spareParts={parts} />);
    expect(screen.getByText("unmapped.loc")).toBeInTheDocument();
    expect(screen.getByText("unmapped_status")).toBeInTheDocument();
  });

  it("does not submit when neither location nor status is selected", async () => {
    const onSubmit = vi.fn();
    render(<BatchMoveSparePartsModal {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    // The schema refine rejects the empty form, so the submit handler never runs.
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });
});
