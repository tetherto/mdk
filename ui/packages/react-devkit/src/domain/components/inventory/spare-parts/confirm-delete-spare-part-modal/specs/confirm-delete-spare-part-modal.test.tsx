import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDeleteSparePartModal } from "../confirm-delete-spare-part-modal";

const mockSparePart = { id: "sp-001", code: "HB-A001" };

describe("ConfirmDeleteSparePartModal", () => {
  it("renders nothing when sparePart is undefined", () => {
    const { container } = render(
      <ConfirmDeleteSparePartModal isOpen onClose={vi.fn()} sparePart={undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the spare part code in the message", () => {
    render(
      <ConfirmDeleteSparePartModal isOpen onClose={vi.fn()} sparePart={mockSparePart} />,
    );
    expect(screen.getByText(/HB-A001/)).toBeInTheDocument();
  });

  it("calls onConfirm with sparePart when confirm button clicked", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDeleteSparePartModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        sparePart={mockSparePart}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith(mockSparePart);
  });

  it("calls onClose when cancel button clicked", () => {
    const onClose = vi.fn();
    render(
      <ConfirmDeleteSparePartModal isOpen onClose={onClose} sparePart={mockSparePart} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
