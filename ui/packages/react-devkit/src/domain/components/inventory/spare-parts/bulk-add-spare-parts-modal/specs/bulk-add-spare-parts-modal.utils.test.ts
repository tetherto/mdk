import { describe, expect, it, vi } from "vitest";

import { MAX_CSV_ITEMS } from "../bulk-add-spare-parts-modal.constants";
import {
  CsvDuplicateRecordError,
  CsvValidationError,
  mapRawRowToRecord,
  parseCsvText,
  validateCSVRecords,
} from "../bulk-add-spare-parts-modal.utils";
import type { CSVRecord, RawCsvRow, ValidateCSVRecordsOptions } from "../bulk-add-spare-parts-modal.utils";

describe("mapRawRowToRecord", () => {
  it("maps raw CSV row fields to CSVRecord shape", () => {
    const row: RawCsvRow = {
      part: "controller",
      model: "CT-S19",
      "miner model": "antminer-s19",
      "serial num": "SN123",
      mac: "AA:BB:CC:DD:EE:FF",
      status: "ok_brand_new",
      location: "site.warehouse",
      comment: "test",
    };
    const result = mapRawRowToRecord(row);
    expect(result.partType).toBe("controller");
    expect(result.model).toBe("CT-S19");
    expect(result.parentDeviceModel).toBe("antminer-s19");
    expect(result.serialNum).toBe("SN123");
    expect(result.macAddress).toBe("AA:BB:CC:DD:EE:FF");
    expect(result.status).toBe("ok_brand_new");
    expect(result.location).toBe("site.warehouse");
    expect(result.comment).toBe("test");
  });
});

describe("CsvDuplicateRecordError", () => {
  it("is an instance of Error with correct name", () => {
    const err = new CsvDuplicateRecordError("duplicate found");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CsvDuplicateRecordError");
    expect(err.message).toBe("duplicate found");
  });
});

describe("MAX_CSV_ITEMS", () => {
  it("is 50", () => {
    expect(MAX_CSV_ITEMS).toBe(50);
  });
});

describe("validateCSVRecords", () => {
  const validRecord: CSVRecord = {
    partType: "controller",
    parentDeviceModel: "antminer-s19",
    model: "CT-S19",
    serialNum: "SN1",
    macAddress: "AA:BB:CC:DD:EE:FF",
    status: "ok_brand_new",
    location: "site.warehouse",
    comment: "",
  };

  const makeOptions = (overrides: Partial<ValidateCSVRecordsOptions> = {}): ValidateCSVRecordsOptions => ({
    checkDuplicateDelegate: vi.fn().mockResolvedValue([]),
    rackIds: { controller: "rack-controller" },
    validLocations: ["site.warehouse"],
    subPartTypes: { controller: new Set(["CT-S19"]) },
    minerModels: ["antminer-s19"],
    ...overrides,
  });

  it("validates records and attaches the matching rackId", async () => {
    const result = await validateCSVRecords([validRecord], makeOptions());
    expect(result).toHaveLength(1);
    expect(result[0]?.rackId).toBe("rack-controller");
    expect(result[0]?.model).toBe("CT-S19");
  });

  it("calls checkDuplicateDelegate with serials grouped by rackId", async () => {
    const checkDuplicateDelegate = vi.fn().mockResolvedValue([]);
    await validateCSVRecords([validRecord], makeOptions({ checkDuplicateDelegate }));
    expect(checkDuplicateDelegate).toHaveBeenCalledWith(
      expect.objectContaining({ rackId: "rack-controller", serialNum: ["SN1"] }),
    );
  });

  // Regression: cross-field model/partType validation must actually run.
  // Zod has no sibling access at the field level, so this lives in an object-level superRefine.
  it("rejects a model that is not in the partType's allowed subtypes", async () => {
    const record = { ...validRecord, model: "CT-UNKNOWN" };
    await expect(validateCSVRecords([record], makeOptions())).rejects.toThrow(/model should be one of/);
  });

  it("rejects an invalid partType", async () => {
    const record = { ...validRecord, partType: "not-a-part" };
    await expect(validateCSVRecords([record], makeOptions())).rejects.toThrow(/Row 1/);
  });

  it("rejects an invalid location", async () => {
    const record = { ...validRecord, location: "mars" };
    await expect(validateCSVRecords([record], makeOptions())).rejects.toThrow(/Invalid location/);
  });

  it("rejects duplicate serial numbers", async () => {
    const records = [validRecord, { ...validRecord, model: "CT-S19" }];
    await expect(validateCSVRecords(records, makeOptions())).rejects.toThrow(
      /Duplicates detected in provided serial numbers/,
    );
  });

  it("throws CsvDuplicateRecordError when the delegate reports an existing conflict", async () => {
    const options = makeOptions({ checkDuplicateDelegate: vi.fn().mockResolvedValue([{ id: "existing" }]) });
    await expect(validateCSVRecords([validRecord], options)).rejects.toBeInstanceOf(CsvDuplicateRecordError);
  });

  it("rejects an invalid miner model", async () => {
    const record = { ...validRecord, parentDeviceModel: "not-a-miner" };
    await expect(validateCSVRecords([record], makeOptions())).rejects.toThrow(/Invalid miner model/);
  });

  it("rejects an invalid status", async () => {
    const record = { ...validRecord, status: "made_up_status" };
    await expect(validateCSVRecords([record], makeOptions())).rejects.toThrow(/Invalid status/);
  });

  it("rejects duplicate MAC addresses across controller records", async () => {
    const records = [
      { ...validRecord, serialNum: "SN1", macAddress: "AA:BB:CC:DD:EE:FF" },
      { ...validRecord, serialNum: "SN2", macAddress: "AA:BB:CC:DD:EE:FF" },
    ];
    await expect(validateCSVRecords(records, makeOptions())).rejects.toThrow(
      /Duplicates detected in provided mac addresses/,
    );
  });

  it("omits macAddress from the delegate for non-controller part types", async () => {
    const checkDuplicateDelegate = vi.fn().mockResolvedValue([]);
    const record = { ...validRecord, partType: "psu", model: "PSU-3000W" };
    await validateCSVRecords([record], {
      ...makeOptions({ checkDuplicateDelegate }),
      rackIds: { psu: "rack-psu" },
      subPartTypes: { psu: new Set(["PSU-3000W"]) },
    });
    expect(checkDuplicateDelegate).toHaveBeenCalledWith(
      expect.not.objectContaining({ macAddress: expect.anything() }),
    );
  });

  it("falls back to an empty rackId when the part type has no mapping", async () => {
    const result = await validateCSVRecords([validRecord], makeOptions({ rackIds: {} }));
    expect(result[0]?.rackId).toBe("");
  });

  it("skips subtype validation when no subtypes are configured for the part type", async () => {
    const result = await validateCSVRecords([validRecord], makeOptions({ subPartTypes: {} }));
    expect(result).toHaveLength(1);
  });

  it("rejects a controller with an empty MAC address", async () => {
    const record = { ...validRecord, macAddress: "" };
    await expect(validateCSVRecords([record], makeOptions())).rejects.toThrow(/valid format/i);
  });

  it("rejects a controller with an invalid MAC address format", async () => {
    const record = { ...validRecord, macAddress: "not-a-mac" };
    await expect(validateCSVRecords([record], makeOptions())).rejects.toThrow(/valid format/i);
  });
});

describe("parseCsvText", () => {
  it("returns an empty array for empty or header-only input", async () => {
    expect(await parseCsvText("")).toEqual([]);
    expect(await parseCsvText("part,model,miner model,serial num,mac,status,location,comment")).toEqual([]);
  });

  it("maps each data row to a CSVRecord", async () => {
    const csv = [
      "part,model,miner model,serial num,mac,status,location,comment",
      "controller,CT-S19,antminer-s19,SN1,AA:BB:CC:DD:EE:FF,ok_brand_new,site.warehouse,hello",
    ].join("\n");
    const [record] = await parseCsvText(csv);
    expect(record).toMatchObject({
      partType: "controller",
      model: "CT-S19",
      serialNum: "SN1",
      comment: "hello",
    });
  });

  it("handles quoted fields containing commas and escaped quotes", async () => {
    const csv = [
      "part,model,miner model,serial num,mac,status,location,comment",
      'controller,CT-S19,antminer-s19,SN1,AA:BB:CC:DD:EE:FF,ok_brand_new,site.warehouse,"a, ""quoted"" note"',
    ].join("\n");
    const [record] = await parseCsvText(csv);
    expect(record?.comment).toBe('a, "quoted" note');
  });

  it("defaults missing trailing values to empty strings", async () => {
    const csv = ["part,model,miner model,serial num,mac,status,location,comment", "controller,CT-S19"].join("\n");
    const [record] = await parseCsvText(csv);
    expect(record?.partType).toBe("controller");
    expect(record?.comment).toBe("");
  });

  it("rejects with CsvValidationError when data rows exceed MAX_CSV_ITEMS", async () => {
    const header = "part,model,miner model,serial num,mac,status,location,comment";
    const rows = Array.from(
      { length: MAX_CSV_ITEMS + 1 },
      (_, i) => `controller,CT-S19,antminer-s19,SN${i},AA:BB:CC:DD:EE:FF,ok_brand_new,site.warehouse,`,
    );
    const csv = [header, ...rows].join("\n");
    await expect(parseCsvText(csv)).rejects.toBeInstanceOf(CsvValidationError);
    await expect(parseCsvText(csv)).rejects.toThrow(`Max items allowed is ${MAX_CSV_ITEMS}`);
  });
});
