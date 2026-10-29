import { useQuery } from "@tetherto/mdk-react-adapter";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  type DataTableColumnDef,
  Spinner,
  Typography,
} from "@tetherto/mdk-react-devkit/primitives";

import { errorMessage } from "./auth";
import type { ActivityEntry, Miner } from "./types";
import { get } from "./utils";

const OUTCOME_STATUS: Record<string, "success" | "error" | "processing"> = {
  COMPLETED: "success",
  SUCCESS: "success",
  REJECTED: "error",
  FAILED: "error",
  TIMEOUT: "error",
  CANCELLED: "error",
};

function columns(minerCode: (deviceId: string | null) => string): DataTableColumnDef<ActivityEntry, unknown>[] {
  return [
    { accessorKey: "ts", header: "Time", cell: ({ getValue }) => new Date(getValue<number>()).toLocaleString() },
    {
      accessorKey: "user",
      header: "Who",
      cell: ({ row }) => (
        <span>
          {row.original.user ?? "—"}
          {row.original.via && <span style={{ opacity: 0.6 }}> via {row.original.via}</span>}
        </span>
      ),
    },
    { accessorKey: "roles", header: "Roles", cell: ({ getValue }) => getValue<string[]>().join(", ") || "—" },
    {
      accessorKey: "command",
      header: "Command",
      cell: ({ row }) => {
        const { command, params } = row.original;
        const mode = typeof params.mode === "string" ? ` → ${params.mode}` : "";
        return `${command ?? "—"}${mode}`;
      },
    },
    { accessorKey: "deviceId", header: "Miner", cell: ({ getValue }) => minerCode(getValue<string | null>()) },
    {
      accessorKey: "outcome",
      header: "Outcome",
      cell: ({ row }) => {
        const outcome = row.original.outcome ?? "UNKNOWN";
        return <Badge status={OUTCOME_STATUS[outcome] ?? "processing"} text={outcome} />;
      },
    },
    {
      accessorKey: "error",
      header: "Reason",
      cell: ({ getValue }) => <span style={{ opacity: 0.8 }}>{getValue<string | null>() ?? ""}</span>,
    },
  ];
}

// Every miner command sent through this site, newest first — refused ones too,
// with the Kernel's reason. Who sent it is the signed-in user, recorded via the
// site app (app:site) that acted for them.
export function ActivityPage({ base, miners }: { base: string; miners: Miner[] }) {
  const activity = useQuery({
    queryKey: ["site-activity"],
    queryFn: () => get<{ entries: ActivityEntry[] }>(base, "/site/activity?limit=200"),
    refetchInterval: 5000,
  });

  const codes = new Map(miners.map((m) => [m.deviceId, m.code || m.deviceId]));
  const minerCode = (id: string | null) => (id ? (codes.get(id) ?? id) : "—");

  return (
    <Card>
      <CardHeader style={{ padding: 20 }}>
        <Typography variant="heading3">Activity — miner commands</Typography>
      </CardHeader>
      <CardBody style={{ padding: 20 }}>
        {activity.isPending && <Spinner />}
        {activity.error && <Typography>{errorMessage(activity.error)}</Typography>}
        {activity.data && activity.data.entries.length === 0 && (
          <Typography style={{ opacity: 0.7 }}>No commands yet. Send one from the Control page.</Typography>
        )}
        {activity.data && activity.data.entries.length > 0 && (
          <DataTable<ActivityEntry>
            data={activity.data.entries}
            columns={columns(minerCode)}
            getRowId={(row) => `${row.ts}-${row.commandId ?? row.user}-${row.deviceId}`}
          />
        )}
      </CardBody>
    </Card>
  );
}
