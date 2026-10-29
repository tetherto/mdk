import { useMemo, useState } from "react";

import { getHashrateString } from "@tetherto/mdk-react-devkit/domain";
import {
  Badge,
  Button,
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
  Switch,
  Typography,
} from "@tetherto/mdk-react-devkit/primitives";

import type { Permissions } from "./permissions";
import { statusBadge } from "./useMinerRows";
import type { Access, Miner, PoolInput } from "./types";

const MINER_TABLE_COLUMNS: DataTableColumnDef<Miner, unknown>[] = [
  { accessorKey: "deviceId", header: "Device ID" },
  { accessorKey: "container", header: "Container", cell: ({ getValue }) => (getValue<string>() || "—") },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const v = getValue<string>();
      return <Badge status={statusBadge(v)} text={v} />;
    },
  },
  { accessorKey: "powerMode", header: "Power mode", cell: ({ getValue }) => (getValue<string | null>() ?? "—") },
  { accessorKey: "hashrateMhs", header: "Hashrate", cell: ({ getValue }) => getHashrateString(getValue<number>()) },
  { accessorKey: "powerW", header: "Power (W)", cell: ({ getValue }) => getValue<number>().toFixed(0) },
  { accessorKey: "temperature", header: "Temp (°C)", cell: ({ getValue }) => getValue<number>().toFixed(1) },
];

export function ControlPage({
  miners,
  access,
  permissions,
  selectedMiner,
  setSelectedMiner,
  selectedMode,
  setSelectedMode,
  modeOptions,
  applyAction,
  actionMsg,
  applyPools,
  poolsMsg,
}: {
  miners: Miner[];
  access: Access | undefined;
  permissions: Permissions;
  selectedMiner: string;
  setSelectedMiner: (v: string) => void;
  selectedMode: string;
  setSelectedMode: (v: string) => void;
  modeOptions: readonly string[];
  applyAction: () => void;
  actionMsg: string;
  applyPools: (pool: PoolInput | null) => void;
  poolsMsg: string;
}) {
  const [poolUrl, setPoolUrl] = useState("");
  const [poolWorker, setPoolWorker] = useState("");
  const [poolPassword, setPoolPassword] = useState("");
  // Off: only the miners the user's roles let them act on. On: every miner, so
  // a refused command shows the Kernel enforcing the policy (and lands in Activity).
  const [showAll, setShowAll] = useState(false);

  const { canSetPowerMode, canSetPools, powerModeMiners, poolMiners } = permissions;
  const controllable = (id: string) =>
    (canSetPowerMode && powerModeMiners.has(id)) || (canSetPools && poolMiners.has(id));
  const listed = showAll ? miners : miners.filter((m) => controllable(m.deviceId));

  const selections = useMemo(
    () => (selectedMiner ? { [selectedMiner]: true } : {}),
    [selectedMiner],
  );

  const lock = (allowed: boolean) => (allowed ? "" : " — not permitted");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHeader style={{ padding: "20px" }}><Typography variant="heading3">Target miner</Typography></CardHeader>
        <CardBody style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {access && (
            <Typography variant="caption" data-testid="control-roles">
              Signed in as <strong>{access.user.sub}</strong> · roles: {access.roles.join(", ") || "none"} ·{" "}
              {powerModeMiners.size} miner(s) for power mode, {poolMiners.size} for pools
            </Typography>
          )}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Typography variant="caption">Miner</Typography>
              <Select value={selectedMiner} onValueChange={setSelectedMiner}>
                <SelectTrigger style={{ minWidth: 280 }} data-testid="miner-select">
                  <SelectValue placeholder={listed.length ? "Select a miner" : "No miners you may control"} />
                </SelectTrigger>
                <SelectContent>
                  {listed.map((m) => (
                    <SelectItem key={m.deviceId} value={m.deviceId}>
                      {m.code || m.deviceId} ({m.powerMode ?? "—"}){lock(controllable(m.deviceId))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Switch checked={showAll} onCheckedChange={setShowAll} data-testid="show-all-miners" />
              <Typography variant="caption">Include miners I may not control (to see the server refuse)</Typography>
            </label>
          </div>
        </CardBody>
      </Card>

      {canSetPowerMode && (
        <Card>
          <CardHeader style={{ padding: "20px" }}><Typography variant="heading3">Set miner power mode</Typography></CardHeader>
          <CardBody style={{ padding: "20px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
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
              <Button onClick={applyAction} disabled={!selectedMiner} data-testid="apply-action">
                Set power mode{lock(powerModeMiners.has(selectedMiner))}
              </Button>
              {actionMsg && <Typography data-testid="action-msg">{actionMsg}</Typography>}
            </div>
          </CardBody>
        </Card>
      )}

      {canSetPools && (
        <Card>
          <CardHeader style={{ padding: "20px" }}><Typography variant="heading3">Configure pools</Typography></CardHeader>
          <CardBody style={{ padding: "20px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Typography variant="caption">Pool URL</Typography>
                <Input
                  style={{ minWidth: 280 }}
                  placeholder="stratum+tcp://pool:3333"
                  value={poolUrl}
                  onChange={(e) => setPoolUrl(e.target.value)}
                  data-testid="pool-url"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Typography variant="caption">Worker name</Typography>
                <Input
                  style={{ minWidth: 180 }}
                  placeholder="account.worker"
                  value={poolWorker}
                  onChange={(e) => setPoolWorker(e.target.value)}
                  data-testid="pool-worker"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Typography variant="caption">Password</Typography>
                <Input
                  style={{ minWidth: 120 }}
                  placeholder="x"
                  value={poolPassword}
                  onChange={(e) => setPoolPassword(e.target.value)}
                  data-testid="pool-password"
                />
              </div>
              <Button
                disabled={!selectedMiner}
                onClick={() =>
                  applyPools(
                    poolUrl || poolWorker
                      ? { url: poolUrl, worker_name: poolWorker, worker_password: poolPassword }
                      : null,
                  )
                }
                data-testid="apply-pools"
              >
                Apply pools{lock(poolMiners.has(selectedMiner))}
              </Button>
              {poolsMsg && <Typography data-testid="pools-msg">{poolsMsg}</Typography>}
            </div>
            <Typography variant="caption" style={{ display: "block", marginTop: 8, opacity: 0.7 }}>
              Leave the fields empty to apply the site default from config/site.deploy.json (worker.pools).
              The miner reboots to pick up new pools.
            </Typography>
          </CardBody>
        </Card>
      )}

      {listed.length > 0 && (
        <Card>
          <CardHeader style={{ padding: "20px" }}>
            <Typography variant="heading3">{showAll ? "All miners" : "Miners you may control"}</Typography>
          </CardHeader>
          <CardBody style={{ padding: "20px" }}>
            <DataTable<Miner>
              data={listed}
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
