import type { CSSProperties, JSX, ReactNode } from "react";

import { useQuery } from "@tetherto/mdk-react-adapter";
import { getHashrateString } from "@tetherto/mdk-react-devkit/domain";
import { Badge, Card, CardBody, CardHeader, Spinner, Typography } from "@tetherto/mdk-react-devkit/primitives";

import type {
  DatumGateway,
  OceanAccount,
  OceanOverview,
  OceanPool,
  OceanWorker,
} from "./types";
import { get } from "./utils";

const MUTED = "#555";
const MHS_PER_HS = 1e-6;
const MHS_PER_THS = 1e6;
// A real Ocean template pays well over a hundred coinbase outputs — the tail is
// summarized rather than listed, or it is the whole page.
const COINBASER_ROWS = 20;

// The devkit's hashrate formatter takes MH/s and picks the unit; Ocean reports
// H/s and DATUM reports TH/s, so both are normalized into it rather than pinned
// to TH/s — a 20 PH/s account reads as "20.81 PH/s", not "20810.38 TH/s".
function hsRate(hs: number): string {
  return getHashrateString(hs * MHS_PER_HS);
}

function thsRate(v: number): string {
  return getHashrateString(v * MHS_PER_THS);
}

function btc(v: number): string {
  return `${v.toFixed(8)} BTC`;
}

function int(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function stamp(ms: number): string {
  return ms > 0 ? new Date(ms).toLocaleString() : "—";
}

function duration(seconds: number): string {
  if (!(seconds > 0)) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

// Seconds-since for the DATUM "age" fields, which use -1 for "never".
function age(seconds: number): string {
  if (seconds < 0) return "never";
  return `${seconds.toFixed(0)}s ago`;
}

function truncate(s: string, head = 10, tail = 6): string {
  if (!s) return "—";
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <Typography variant="caption" style={{ color: MUTED, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body" style={{ wordBreak: "break-word" }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" style={{ color: MUTED, display: "block" }}>
          {hint}
        </Typography>
      ) : null}
    </div>
  );
}

function StatGrid({ children, min = 140 }: { children: ReactNode; min?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12 }}>
      {children}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 20 }}
      >
        <Typography variant="heading3">{title}</Typography>
        {action}
      </CardHeader>
      <CardBody style={{ padding: 20 }}>{children}</CardBody>
    </Card>
  );
}

const CELL: CSSProperties = { padding: "6px 10px", textAlign: "left", whiteSpace: "nowrap" };

function Table<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: { title: string; render: (row: T) => ReactNode }[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty: string;
}) {
  if (!rows.length) {
    return (
      <Typography variant="caption" style={{ color: MUTED }}>
        {empty}
      </Typography>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.title} style={{ ...CELL, color: MUTED, fontWeight: 500, borderBottom: "1px solid #d8dde3" }}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map((c) => (
                <td key={c.title} style={{ ...CELL, borderBottom: "1px solid #eef1f4" }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountCard({ account }: { account: OceanAccount }) {
  return (
    <Card>
      <CardHeader
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 20 }}
      >
        <Typography variant="heading3" style={{ minWidth: 0, wordBreak: "break-word" }}>
          {account.username || "(account)"}
        </Typography>
        <Badge
          status={account.activeWorkersCount > 0 ? "success" : "error"}
          text={`${account.activeWorkersCount} / ${account.workerCount} workers`}
        />
      </CardHeader>
      <CardBody style={{ padding: 20 }}>
        <StatGrid>
          <Stat label="Hashrate (60s)" value={hsRate(account.hashrate)} />
          <Stat label="Hashrate (1h)" value={hsRate(account.hashrate1h)} />
          <Stat label="Hashrate (24h)" value={hsRate(account.hashrate24h)} />
          <Stat label="Last poll" value={stamp(account.timestamp)} />
        </StatGrid>
      </CardBody>
    </Card>
  );
}

function GatewaySection({ gateway, available }: { gateway: DatumGateway; available: boolean }) {
  if (!available) {
    return (
      <Panel title="DATUM gateway">
        <Typography variant="caption" style={{ color: MUTED }}>
          This pool worker serves no DATUM keys — it is running against the bundled Ocean REST mock. Point the example at
          a real miningos-wrk-minerpool-ocean (config/ocean-remote.json) with a <code>datum.apiUrl</code> configured to
          populate this section.
        </Typography>
      </Panel>
    );
  }

  const { clientStats, stratumInfo, job } = gateway;
  const online = gateway.status === "online";
  const connections = stratumInfo ? stratumInfo.totalConnections : gateway.connections;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel
        title="DATUM gateway"
        action={<Badge status={online ? "success" : "error"} text={gateway.status ?? "unknown"} />}
      >
        {gateway.error ? (
          <Typography variant="caption" style={{ color: "#c0392b", display: "block", marginBottom: 12 }}>
            {gateway.error}
          </Typography>
        ) : null}
        <StatGrid>
          <Stat label="Connections" value={int(gateway.connections)} />
          <Stat label="Est. hashrate" value={thsRate(gateway.hashrateThs)} />
          {stratumInfo ? <Stat label="Active threads" value={int(stratumInfo.activeThreads)} /> : null}
          {stratumInfo ? (
            <Stat label="Work subscriptions" value={int(stratumInfo.totalWorkSubscriptions)} />
          ) : null}
          {clientStats ? <Stat label="Uptime" value={duration(clientStats.uptimeS)} /> : null}
          {clientStats ? (
            <Stat label="Template" value={clientStats.ready ? "ready" : "not ready"} />
          ) : null}
        </StatGrid>
      </Panel>

      {clientStats ? (
        <Panel title="Decentralized client">
          <StatGrid>
            <Stat label="Pool host" value={clientStats.poolHost || "—"} />
            <Stat label="Pool tag" value={clientStats.poolTag || "—"} />
            <Stat label="Miner tag" value={clientStats.minerTag || "—"} />
            <Stat label="Pool min diff" value={int(clientStats.poolMinDiff)} />
            <Stat
              label="Accepted shares"
              value={int(clientStats.acceptedShares)}
              hint={`${int(clientStats.acceptedSharesDiff)} diff`}
            />
            <Stat
              label="Rejected shares"
              value={int(clientStats.rejectedShares)}
              hint={`${int(clientStats.rejectedSharesDiff)} diff`}
            />
            <Stat label="Pool pubkey" value={truncate(clientStats.poolPubKey, 12, 8)} />
          </StatGrid>
        </Panel>
      ) : null}

      {job ? (
        <Panel title="Current stratum job">
          {job.error !== undefined ? (
            <Typography variant="caption" style={{ color: MUTED }}>
              {job.error}
            </Typography>
          ) : (
            <StatGrid>
              <Stat label="Block height" value={int(job.blockHeight)} />
              <Stat label="Block value" value={btc(job.blockValueBtc)} />
              <Stat label="Network difficulty" value={job.blockDifficulty.toExponential(4)} />
              <Stat label="Transactions" value={int(job.txCount)} />
              <Stat label="Size" value={`${(job.sizeBytes / 1e6).toFixed(2)} MB`} />
              <Stat label="Weight" value={int(job.weight)} />
              <Stat label="Sigops" value={int(job.sigops)} />
              <Stat label="Bits" value={job.bits || "—"} />
              <Stat label="Version" value={job.versionHex || "—"} />
              <Stat label="Template time" value={stamp(job.timeCurrent * 1000)} />
            </StatGrid>
          )}
        </Panel>
      ) : null}

      <Panel title="Stratum threads">
        <Table
          rows={gateway.threads}
          rowKey={(t) => t.id}
          empty="No stratum thread has a connection."
          columns={[
            { title: "Thread", render: (t) => t.id },
            { title: "Connections", render: (t) => int(t.connectionCount) },
            { title: "Subscriptions", render: (t) => int(t.subscriptionCount) },
            { title: "Approx hashrate", render: (t) => thsRate(t.approxHashrateThs) },
          ]}
        />
      </Panel>

      <Panel title="Stratum clients">
        <Table
          rows={gateway.clients}
          rowKey={(c) => c.id}
          // An empty list is ambiguous: nothing is connected, or the gateway
          // withheld it. `connections` comes from a public endpoint, so it
          // tells the two apart.
          empty={
            connections === 0
              ? "No miners are connected to the gateway."
              : `The gateway reports ${connections} connection(s) but served no client list — /v1/stratum_client_list needs api.admin_password set, and matching datum.user / datum.password on the pool worker.`
          }
          columns={[
            { title: "Worker", render: (c) => c.authUsername || "—" },
            { title: "Remote", render: (c) => c.remoteHost || "—" },
            {
              title: "State",
              render: (c) => <Badge status={c.subscribed ? "success" : "warning"} text={c.subscribed ? "subscribed" : "connected"} />,
            },
            { title: "Hashrate", render: (c) => (c.hashrateThs == null ? "—" : thsRate(c.hashrateThs)) },
            { title: "Vardiff", render: (c) => int(c.vdiff) },
            { title: "Accepted", render: (c) => int(c.acceptedCount) },
            { title: "Rejected", render: (c) => `${int(c.rejectedCount)} (${c.rejectedPct.toFixed(2)}%)` },
            { title: "Last share", render: (c) => age(c.lastShareS) },
            { title: "Coinbase", render: (c) => c.coinbase || "—" },
            { title: "User agent", render: (c) => c.useragent || "—" },
          ]}
        />
      </Panel>

      <Panel
        title={`Coinbaser outputs (${gateway.coinbaser.length})`}
        action={
          <Typography variant="caption" style={{ color: MUTED }}>
            {btc(gateway.coinbaser.reduce((sum, o) => sum + o.valueBtc, 0))} total
          </Typography>
        }
      >
        <Table
          rows={gateway.coinbaser.slice(0, COINBASER_ROWS)}
          rowKey={(o) => o.address}
          empty="No coinbase outputs in the current template."
          columns={[
            { title: "Address", render: (o) => <code>{truncate(o.address, 14, 10)}</code> },
            { title: "Value", render: (o) => btc(o.valueBtc) },
            { title: "Sats", render: (o) => int(o.valueSats) },
          ]}
        />
        {gateway.coinbaser.length > COINBASER_ROWS ? (
          <Typography variant="caption" style={{ color: MUTED, display: "block", marginTop: 8 }}>
            + {gateway.coinbaser.length - COINBASER_ROWS} smaller outputs totalling{" "}
            {btc(gateway.coinbaser.slice(COINBASER_ROWS).reduce((sum, o) => sum + o.valueBtc, 0))}
          </Typography>
        ) : null}
      </Panel>
    </div>
  );
}

function PoolSection({ pool }: { pool: OceanPool }) {
  // `stats` knows the real worker count; the `workers` key serves at most 100
  // rows per request, so on a large account the table is a first page.
  const workerTotal = pool.accounts.reduce((sum, a) => sum + a.workerCount, 0);
  const truncated = workerTotal > pool.workers.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <Typography variant="heading3">{pool.workerId}</Typography>
        <Typography variant="caption" style={{ color: MUTED }}>
          {pool.poolType} · stats polled {stamp(pool.ts)}
        </Typography>
      </div>

      {pool.alerts.length > 0 && (
        <Panel title={`Alerts (${pool.alerts.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pool.alerts.map((a) => (
              <div key={a.uuid} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge status={a.severity === "critical" ? "error" : "warning"} text={a.severity} />
                <Typography variant="body">{a.description || a.name}</Typography>
                <Typography variant="caption" style={{ color: MUTED }}>
                  since {stamp(a.createdAt)}
                </Typography>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {pool.accounts.map((a) => (
          <AccountCard key={a.username || pool.deviceId} account={a} />
        ))}
      </div>

      <GatewaySection gateway={pool.gateway} available={pool.gatewayAvailable} />

      <Panel
        title={`Pool workers (${truncated ? `${pool.workers.length} of ${workerTotal}` : pool.workers.length})`}
        action={
          <Typography variant="caption" style={{ color: MUTED }}>
            {[
              truncated ? "the worker serves at most 100 per page" : null,
              // A live `workers` read carries no timestamp (the worker only
              // stamps the persisted buckets), so there is nothing to show.
              pool.workersTs > 0 ? `polled ${stamp(pool.workersTs)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
        }
      >
        <Table
          rows={pool.workers}
          rowKey={(w) => `${w.username}-${w.id}`}
          empty="The pool reported no workers."
          columns={[
            { title: "Worker", render: (w) => w.name || w.id },
            // One account is the norm, and its name is already the card title —
            // repeating a 62-char bech32 address on every row only costs width.
            ...(pool.accounts.length > 1
              ? [{ title: "Account", render: (w: OceanWorker) => w.username || "—" }]
              : []),
            {
              title: "State",
              render: (w) => <Badge status={w.online ? "success" : "error"} text={w.online ? "online" : "offline"} />,
            },
            { title: "60s", render: (w) => hsRate(w.hashrate) },
            { title: "1h", render: (w) => hsRate(w.hashrate1h) },
            { title: "24h", render: (w) => hsRate(w.hashrate24h) },
            { title: "Updated", render: (w) => stamp(w.lastUpdated * 1000) },
          ]}
        />
      </Panel>
    </div>
  );
}

// Detail tab for the Ocean minerpool worker and the DATUM gateway it proxies.
// Own query rather than a slice of /site/overview: this pulls a dozen ext_data
// keys per pool, far too heavy for the 3s overview poll the rest of the UI runs on.
export function OceanPage({ base }: { base: string }): JSX.Element {
  const oceanQuery = useQuery({
    queryKey: ["site-ocean"],
    queryFn: () => get<OceanOverview>(base, "/site/ocean"),
    refetchInterval: 15000,
  });

  if (oceanQuery.isError) {
    return (
      <Typography variant="body" style={{ color: "#c0392b" }}>
        Cannot load Ocean pool detail: {(oceanQuery.error as Error)?.message}
      </Typography>
    );
  }

  if (!oceanQuery.data) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Spinner />
        <Typography>Loading Ocean pool and DATUM gateway data…</Typography>
      </div>
    );
  }

  const pools = oceanQuery.data.pools;

  if (!pools.length) {
    return (
      <Typography variant="body">
        No Ocean minerpool worker is registered with the Kernel. Only <code>poolType: "ocean"</code> workers appear here.
      </Typography>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {pools.map((pool) => (
        <PoolSection key={pool.deviceId} pool={pool} />
      ))}
    </div>
  );
}
