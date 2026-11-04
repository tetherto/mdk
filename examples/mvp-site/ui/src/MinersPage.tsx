import { useState } from "react";

import { getHashrateString } from "@tetherto/mdk-react-devkit/domain";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  type DataTableColumnDef,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Typography,
} from "@tetherto/mdk-react-devkit/primitives";

import type { Miner } from "./types";
import { ALL, type MinerRow, statusBadge, useMinerRows } from "./useMinerRows";

const COLUMNS: DataTableColumnDef<MinerRow, unknown>[] = [
  { accessorKey: "code", header: "Miner" },
  { accessorKey: "family", header: "Brand" },
  { accessorKey: "workerId", header: "Worker", cell: ({ getValue }) => getValue<string>() || "—" },
  { accessorKey: "container", header: "Container", cell: ({ getValue }) => getValue<string>() || "—" },
  { accessorKey: "pos", header: "Position", cell: ({ getValue }) => getValue<string>() || "—" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const v = getValue<string>();
      return <Badge status={statusBadge(v)} text={v} />;
    },
  },
  { accessorKey: "powerMode", header: "Power mode", cell: ({ getValue }) => getValue<string | null>() ?? "—" },
  { accessorKey: "hashrateMhs", header: "Hashrate", cell: ({ getValue }) => getHashrateString(getValue<number>()) },
  { accessorKey: "powerW", header: "Power (W)", cell: ({ getValue }) => getValue<number>().toFixed(0) },
  {
    accessorKey: "efficiencyWth",
    header: "Efficiency (W/TH)",
    cell: ({ getValue }) => getValue<number | null>()?.toFixed(1) ?? "—",
  },
  { accessorKey: "temperature", header: "Temp (°C)", cell: ({ getValue }) => getValue<number>().toFixed(1) },
];

function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  testId: string;
}) {
  return (
    <div className="site-field">
      <Typography variant="caption">{label}</Typography>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="site-field-160" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Fleet-wide miner list across every miner worker (Whatsminer, Antminer, …),
// filterable by brand/status/container plus a free-text search.
export function MinersPage({ miners }: { miners: Miner[] }) {
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [container, setContainer] = useState(ALL);

  const { rows, options, filtered, summary } = useMinerRows(miners, { search, family, status, container });

  return (
    <div className="site-stack-16">
      <Typography variant="heading3">Miners</Typography>

      <Card>
        <CardHeader className="site-card-pad">
          <div className="site-filters">
            <div className="site-field">
              <Typography variant="caption">Search</Typography>
              <Input
                className="site-field-240"
                placeholder="Miner, worker or container"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="miners-search"
              />
            </div>
            <FilterSelect label="Brand" value={family} onChange={setFamily} options={options.family} testId="miners-family" />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={options.status} testId="miners-status" />
            <FilterSelect
              label="Container"
              value={container}
              onChange={setContainer}
              options={options.container}
              testId="miners-container"
            />
            <Typography variant="caption" className="site-miners__count" data-testid="miners-summary">
              {filtered.length} of {rows.length} miners · {summary.online} online ·{" "}
              {getHashrateString(summary.hashrateMhs)} · {(summary.powerW / 1000).toFixed(1)} kW
            </Typography>
          </div>
        </CardHeader>
        <CardBody className="site-card-pad">
          {rows.length === 0 ? (
            <Typography>No miners reported yet.</Typography>
          ) : (
            <DataTable<MinerRow>
              data={filtered}
              columns={COLUMNS}
              getRowId={(row) => row.deviceId}
              defaultSorting={[{ id: "code", desc: false }]}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
