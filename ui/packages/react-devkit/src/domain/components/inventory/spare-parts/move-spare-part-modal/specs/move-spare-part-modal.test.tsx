import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MoveSparePartModal } from "../move-spare-part-modal";

const locationOptions = [
  { value: "site.warehouse", label: "Site Warehouse" },
  { value: "workshop.warehouse", label: "Workshop Warehouse" },
];

const statusOptions = [
  { value: "ok_brand_new", label: "Brand New" },
  { value: "faulty", label: "Faulty" },
];

const mockSparePart = {
  id: "sp-001",
  code: "HB-A001",
  location: "site.warehouse",
  status: "ok_brand_new",
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  sparePart: mockSparePart,
  locationOptions,
  statusOptions,
};

describe("MoveSparePartModal", () => {
  it("renders nothing when sparePart is undefined", () => {
    const { container } = render(
      <MoveSparePartModal {...defaultProps} sparePart={undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows current location and status on step 1", () => {
    render(<MoveSparePartModal {...defaultProps} />);
    expect(screen.getByText(/current location/i)).toBeInTheDocument();
    expect(screen.getByText(/current status/i)).toBeInTheDocument();
  });

  it("shows form header with move instructions on step 1", () => {
    render(<MoveSparePartModal {...defaultProps} />);
    expect(screen.getByText(/move spare part to/i)).toBeInTheDocument();
  });

  it("shows no-changes message when values match current", () => {
    render(<MoveSparePartModal {...defaultProps} />);
    expect(screen.getByText(/no changes made/i)).toBeInTheDocument();
  });

  it("shows Save Changes when requested values differ from the current state", () => {
    render(<MoveSparePartModal {...defaultProps} requestedValues={{ location: "workshop.warehouse" }} />);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.queryByText(/no changes made/i)).not.toBeInTheDocument();
  });

  it("advances to the confirmation step and previews the new state", async () => {
    render(<MoveSparePartModal {...defaultProps} requestedValues={{ location: "workshop.warehouse" }} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByText(/new location/i)).toBeInTheDocument();
    expect(screen.getByText(/new status/i)).toBeInTheDocument();
  });

  it("returns to step 1 when cancel is clicked on the confirmation step", async () => {
    render(<MoveSparePartModal {...defaultProps} requestedValues={{ location: "workshop.warehouse" }} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText(/are you sure/i);
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(await screen.findByText(/move spare part to/i)).toBeInTheDocument();
  });

  it("resets to step 1 when the dialog is closed and reopened", async () => {
    const { rerender } = render(
      <MoveSparePartModal {...defaultProps} requestedValues={{ location: "workshop.warehouse" }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText(/are you sure/i);

    rerender(<MoveSparePartModal {...defaultProps} isOpen={false} requestedValues={{ location: "workshop.warehouse" }} />);
    rerender(<MoveSparePartModal {...defaultProps} isOpen={true} requestedValues={{ location: "workshop.warehouse" }} />);

    expect(await screen.findByText(/move spare part to/i)).toBeInTheDocument();
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });

  it("submits the move and closes from the confirmation step", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <MoveSparePartModal
        {...defaultProps}
        requestedValues={{ location: "workshop.warehouse" }}
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText(/are you sure/i);
    fireEvent.click(screen.getByRole("button", { name: /request changes/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
