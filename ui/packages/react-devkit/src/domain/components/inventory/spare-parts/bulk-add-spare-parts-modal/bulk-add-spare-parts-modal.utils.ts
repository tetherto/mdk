import _compact from "lodash/compact";
import _filter from "lodash/filter";
import _flatten from "lodash/flatten";
import _groupBy from "lodash/groupBy";
import _includes from "lodash/includes";
import _isEmpty from "lodash/isEmpty";
import _map from "lodash/map";
import _reject from "lodash/reject";
import _slice from "lodash/slice";
import _toPairs from "lodash/toPairs";
import _uniqBy from "lodash/uniqBy";
import _values from "lodash/values";
import { z } from "zod";

import {
  CSV_PART_TYPE_TO_SPARE_PART_TYPE,
  SPARE_PART_STATUSES,
  SPARE_PART_TYPE_TO_CSV_PART_TYPE,
  SparePartTypes,
} from "../../../../constants/spare-parts-constants";
import {
  INVALID_MAC_ADDRESS_ERROR,
  MAC_ADDRESS_REGEX,
} from "../add-spare-part-modal/add-spare-part-modal.constants";
import { CSV_TEMPLATE_HEADERS, MAX_CSV_ITEMS } from "./bulk-add-spare-parts-modal.constants";

export type CSVRecord = {
  partType?: string;
  model?: string;
  parentDeviceModel?: string;
  serialNum?: string;
  macAddress?: string;
  status?: string;
  location?: string;
  comment?: string;
  rackId?: string;
  [key: string]: unknown;
};

export class CsvDuplicateRecordError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "CsvDuplicateRecordError";
  }
}

export class CsvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvValidationError";
  }
}

const buildCsvRecordSchema = (
  validLocations: string[],
  subPartTypes: Record<string, Set<string>>,
  minerModels: string[],
) =>
  z.object({
    partType: z
      .string()
      .trim()
      .refine((value) => _values(SPARE_PART_TYPE_TO_CSV_PART_TYPE).includes(value), {
        message: `partType must be one of: ${_values(SPARE_PART_TYPE_TO_CSV_PART_TYPE).join(", ")}`,
      }),
    parentDeviceModel: z
      .string()
      .trim()
      .refine((value) => !minerModels.length || minerModels.includes(value), {
        message: "Invalid miner model",
      }),
    model: z.string().trim().min(1, "model is required"),
    serialNum: z.string().trim().min(1, "serialNum is required"),
    macAddress: z.string().trim().optional(),
    status: z
      .string()
      .trim()
      .refine(
        (value) =>
          _reject(_values(SPARE_PART_STATUSES), (status) => status === SPARE_PART_STATUSES.UNKNOWN).includes(value),
        { message: "Invalid status" },
      ),
    location: z
      .string()
      .trim()
      .refine((value) => !validLocations.length || validLocations.includes(value), {
        message: "Invalid location",
      }),
    comment: z.string().trim().optional(),
  })
    // Cross-field validations run at the object level — Zod field refinements have no sibling access.
    .superRefine((record, ctx) => {
      const validModels = subPartTypes[record.partType] ?? new Set<string>();
      if (validModels.size > 0 && !validModels.has(record.model)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["model"],
          message: `model should be one of ${JSON.stringify([...validModels])}`,
        });
      }

      // Controllers require a valid MAC address, mirroring single-add validation.
      const mappedPartType = (CSV_PART_TYPE_TO_SPARE_PART_TYPE as Record<string, string>)[record.partType];
      if (mappedPartType === SparePartTypes.CONTROLLER) {
        if (!record.macAddress || !MAC_ADDRESS_REGEX.test(record.macAddress)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["macAddress"],
            message: INVALID_MAC_ADDRESS_ERROR,
          });
        }
      }
    });

const buildArraySchema = () =>
  z
    .array(z.unknown())
    .min(2, "At least 1 record needed")
    .max(MAX_CSV_ITEMS + 1, `Max items allowed is ${MAX_CSV_ITEMS}`)
    .superRefine((arr, ctx) => {
      const records = _slice(arr as CSVRecord[], 1);
      if (_uniqBy(records, "serialNum").length !== records.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicates detected in provided serial numbers",
        });
      }
      const controllers = _filter(records, (record: CSVRecord) => {
        const partType = record?.partType;
        return partType
          ? (CSV_PART_TYPE_TO_SPARE_PART_TYPE as Record<string, string>)[partType] ===
              SparePartTypes.CONTROLLER
          : false;
      });
      if (_uniqBy(controllers, "macAddress").length !== controllers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicates detected in provided mac addresses",
        });
      }
    });

export type ValidateCSVRecordsOptions = {
  checkDuplicateDelegate: (params: {
    rackId: string;
    serialNum: string[];
    macAddress?: string[];
  }) => Promise<unknown[]>;
  rackIds: Record<string, string>;
  validLocations?: string[];
  subPartTypes?: Record<string, Set<string>>;
  minerModels?: string[];
};

export async function validateCSVRecords(
  records: CSVRecord[],
  {
    checkDuplicateDelegate,
    rackIds,
    validLocations = [],
    subPartTypes = {},
    minerModels = [],
  }: ValidateCSVRecordsOptions,
): Promise<(CSVRecord & { rackId: string })[]> {
  const recordSchema = buildCsvRecordSchema(validLocations, subPartTypes, minerModels);
  const arraySchema = buildArraySchema();

  const validationPayload = [null, ...records];
  await arraySchema.parseAsync(validationPayload);

  const validatedRecords = await Promise.all(
    _slice(records, 0).map(async (record, index) => {
      try {
        const parsed = await recordSchema.parseAsync(record);
        return { ...parsed, rackId: rackIds[parsed.partType] ?? "" };
      } catch (err) {
        if (err instanceof z.ZodError) {
          throw new Error(`Row ${index + 1}: ${err.errors.map((issue) => issue.message).join("; ")}`);
        }
        throw err;
      }
    }),
  );

  const rackIdWiseRecords = _groupBy(validatedRecords, "rackId");

  const duplicateResults = await Promise.all(
    _map(_toPairs(rackIdWiseRecords), ([rackId, rackRecords]) => {
      const isController = _includes(rackId, SparePartTypes.CONTROLLER);
      const serialNums = _map(rackRecords, (record) => record.serialNum).filter(
        (serial): serial is string => !!serial,
      );
      const macAddresses = _map(rackRecords, (record) => record.macAddress).filter(
        (mac): mac is string => !!mac,
      );
      return checkDuplicateDelegate({
        rackId,
        serialNum: serialNums,
        ...(isController ? { macAddress: macAddresses } : {}),
      });
    }),
  );

  const duplicates = _flatten(duplicateResults);
  if (!_isEmpty(_compact(duplicates))) {
    throw new CsvDuplicateRecordError(
      "CSV has conflicting serial numbers or MAC addresses with existing data",
    );
  }

  return validatedRecords as (CSVRecord & { rackId: string })[];
}

export const downloadCsvTemplate = (filename = "miners.csv") => {
  const csvContent = `data:text/csv;charset=utf-8,${CSV_TEMPLATE_HEADERS.join(",")}`;
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export type RawCsvRow = {
  part: string;
  model: string;
  "miner model": string;
  "serial num": string;
  mac: string;
  status: string;
  location: string;
  comment: string;
};

export const mapRawRowToRecord = (row: RawCsvRow): CSVRecord => ({
  partType: row.part,
  model: row.model,
  parentDeviceModel: row["miner model"],
  serialNum: row["serial num"],
  macAddress: row.mac,
  status: row.status,
  location: row.location,
  comment: row.comment,
});

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] ?? "";
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

export const parseCsvText = (text: string): Promise<CSVRecord[]> =>
  new Promise((resolve, reject) => {
    try {
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) {
        resolve([]);
        return;
      }
      const dataLines = lines.slice(1);
      if (dataLines.length > MAX_CSV_ITEMS) {
        reject(new CsvValidationError(`Max items allowed is ${MAX_CSV_ITEMS}`));
        return;
      }
      const headers = parseCsvLine(lines[0] ?? "");
      const rows = dataLines.map((line) => {
        const values = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] ?? "";
        });
        return mapRawRowToRecord(row as RawCsvRow);
      });
      resolve(rows);
    } catch (err: unknown) {
      reject(err);
    }
  });
