/** The two-step flow of the move dialog: pick the new location/status, then confirm. */
export const STEP = { ONE: 1, TWO: 2 } as const;

/** Spare part attributes rendered by `SparePartDetails`, in order, mapped to their lodash `_get` accessor. */
export const SPARE_PART_DETAIL_ATTRIBUTES: { label: string; accessor: string }[] = [
  { label: "Code", accessor: "code" },
  { label: "Model", accessor: "type" },
  { label: "Site", accessor: "site" },
  { label: "Part SN", accessor: "serialNum" },
  { label: "MAC", accessor: "macAddress" },
];
