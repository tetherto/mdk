import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BulkAddSparePartsModal } from "../bulk-add-spare-parts-modal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
};

const VALID_CSV = [
  "part,model,miner model,serial num,mac,status,location,comment",
  "controller,CT-S19,antminer-s19,SN1,AA:BB:CC:DD:EE:FF,ok_brand_new,site.warehouse,",
].join("\n");

// File.prototype.text() isn't implemented consistently across test DOMs — stub it.
const makeCsvFile = (content: string, name = "test.csv", { reject = false } = {}): File => {
  const file = new File([content], name, { type: "text/csv" });
  Object.defineProperty(file, "text", {
    value: () => (reject ? Promise.reject(new Error("boom")) : Promise.resolve(content)),
  });
  return file;
};

const selectFile = (file: File): void => {
  // DialogContent renders in a portal on document.body, not inside render()'s container.
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not found");
  fireEvent.change(input, { target: { files: [file] } });
};

describe("BulkAddSparePartsModal", () => {
  it("renders the upload button", () => {
    render(<BulkAddSparePartsModal {...defaultProps} />);
    expect(screen.getByText(/click to select csv/i)).toBeInTheDocument();
  });

  it("renders the download template link", () => {
    render(<BulkAddSparePartsModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /download csv template/i })).toBeInTheDocument();
  });

  it("Upload button is disabled when no file selected", () => {
    render(<BulkAddSparePartsModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /^upload$/i })).toBeDisabled();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(<BulkAddSparePartsModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows loader when isLoading is true", () => {
    render(<BulkAddSparePartsModal {...defaultProps} isLoading />);
    expect(screen.queryByText(/click to select csv/i)).not.toBeInTheDocument();
  });

  it("parses a selected CSV, shows the filename, and enables upload", async () => {
    render(<BulkAddSparePartsModal {...defaultProps} />);
    selectFile(makeCsvFile(VALID_CSV));
    expect(await screen.findByText("test.csv")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^upload$/i })).toBeEnabled();
  });

  it("clears the selection when the remove button is clicked", async () => {
    render(<BulkAddSparePartsModal {...defaultProps} />);
    selectFile(makeCsvFile(VALID_CSV));
    await screen.findByText("test.csv");
    fireEvent.click(screen.getByRole("button", { name: /remove file/i }));
    expect(screen.queryByText("test.csv")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^upload$/i })).toBeDisabled();
  });

  it("shows an error when the CSV cannot be read", async () => {
    render(<BulkAddSparePartsModal {...defaultProps} />);
    selectFile(makeCsvFile("x", "bad.csv", { reject: true }));
    expect(await screen.findByText(/unable to parse uploaded csv/i)).toBeInTheDocument();
  });

  it("submits parsed records and closes on success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <BulkAddSparePartsModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />,
    );
    selectFile(makeCsvFile(VALID_CSV));
    await screen.findByText("test.csv");
    fireEvent.click(screen.getByRole("button", { name: /^upload$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("surfaces the returned error and stays open on submit failure", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Server rejected the upload" });
    const onClose = vi.fn();
    render(
      <BulkAddSparePartsModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />,
    );
    selectFile(makeCsvFile(VALID_CSV));
    await screen.findByText("test.csv");
    fireEvent.click(screen.getByRole("button", { name: /^upload$/i }));
    expect(await screen.findByText("Server rejected the upload")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
