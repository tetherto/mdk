import { useEffect, useRef, useState } from "react";

import { CsvValidationError, parseCsvText } from "./bulk-add-spare-parts-modal.utils";
import type { CSVRecord } from "./bulk-add-spare-parts-modal.utils";

export type UseBulkCsvUploadResult = {
  records: CSVRecord[];
  fileName: string | null;
  uploadError: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemove: () => void;
};

export const useBulkCsvUpload = (isOpen: boolean): UseBulkCsvUploadResult => {
  const [records, setRecords] = useState<CSVRecord[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setRecords([]);
      setFileName(null);
      setUploadError(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [isOpen]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const text = await file.text();
      const parsed = await parseCsvText(text);
      if (parsed.length === 0) {
        setUploadError("No data rows found in the CSV");
        setFileName(null);
        setRecords([]);
        return;
      }
      setRecords(parsed);
      setFileName(file.name);
    } catch (err) {
      setRecords([]);
      setFileName(null);
      setUploadError(err instanceof CsvValidationError ? err.message : "Unable to parse uploaded CSV");
    }
  };

  const handleRemove = () => {
    setRecords([]);
    setFileName(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return { records, fileName, uploadError, inputRef, handleFileChange, handleRemove };
};
