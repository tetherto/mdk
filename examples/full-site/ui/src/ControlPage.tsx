import { useMemo } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  type DataTableColumnDef,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Typography,
} from "@tetherto/mdk-react-devkit/primitives";

import type { Miner } from "./types";

const MINER_TABLE_COLUMNS: DataTableColumnDef<Miner, unknown>[] = [
  { accessorKey: "deviceId", header: "Device ID" },
  { accessorKey: "container", header: "Container", cell: ({ getValue }) => (getValue<string>() || "—") },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const v = getValue<string>();
      return <Badge status={v === "online" ? "success" : "error"} text={v} />;
    },
  },
  { accessorKey: "powerMode", header: "Power mode", cell: ({ getValue }) => (getValue<string | null>() ?? "—") },
  { accessorKey: "hashrateMhs", header: "Hashrate (MH/s)", cell: ({ getValue }) => getValue<number>().toFixed(0) },
  { accessorKey: "powerW", header: "Power (W)", cell: ({ getValue }) => getValue<number>().toFixed(0) },
  { accessorKey: "temperature", header: "Temp (°C)", cell: ({ getValue }) => getValue<number>().toFixed(1) },
];

export function ControlPage({
  miners,
  selectedMiner,
  setSelectedMiner,
  selectedMode,
  setSelectedMode,
  modeOptions,
  applyAction,
  actionMsg,
}: {
  miners: Miner[];
  selectedMiner: string;
  setSelectedMiner: (v: string) => void;
  selectedMode: string;
  setSelectedMode: (v: string) => void;
  modeOptions: readonly string[];
  applyAction: () => void;
  actionMsg: string;
}) {
  const selections = useMemo(
    () => (selectedMiner ? { [selectedMiner]: true } : {}),
    [selectedMiner],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHeader style={{ padding: "20px" }}><Typography variant="heading3">Set miner power mode</Typography></CardHeader>
        <CardBody style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Typography variant="caption">Miner</Typography>
              <Select value={selectedMiner} onValueChange={setSelectedMiner}>
                <SelectTrigger style={{ minWidth: 220 }} data-testid="miner-select">
                  <SelectValue placeholder="Select a miner" />
                </SelectTrigger>
                <SelectContent>
                  {miners.map((m) => (
                    <SelectItem key={m.deviceId} value={m.deviceId}>
                      {m.deviceId} ({m.powerMode ?? "—"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Typography variant="caption">Power mode</Typography>
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger style={{ minWidth: 140 }} data-testid="mode-select">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyAction} data-testid="apply-action">Set power mode</Button>
            {actionMsg && <Typography data-testid="action-msg">{actionMsg}</Typography>}
          </div>
        </CardBody>
      </Card>

      {miners.length > 0 && (
        <Card>
          <CardHeader style={{ padding: "20px" }}><Typography variant="heading3">All miners</Typography></CardHeader>
          <CardBody style={{ padding: "20px" }}>
            <DataTable<Miner>
              data={miners}
              columns={MINER_TABLE_COLUMNS}
              getRowId={(row) => row.deviceId}
              enableRowSelection
              enableMultiRowSelection={false}
              selections={selections}
              onSelectionsChange={(sel) => {
                const id = Object.entries(sel).find(([, v]) => v)?.[0];
                if (id) setSelectedMiner(id);
              }}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
