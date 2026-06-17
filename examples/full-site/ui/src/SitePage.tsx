import type { JSX } from "react";
import { useMemo, useState } from "react";

import { useMdkContext, useQuery } from "@tetherto/mdk-react-adapter";
import {
  HeaderConsumptionBox,
  LineChartCard,
  MetricCard,
  MiningPoolsPanel,
  Socket,
} from "@tetherto/mdk-react-devkit/foundation";
import type { LineChartCardData, MiningPoolRow } from "@tetherto/mdk-react-devkit/foundation";
import { Button, Spinner, Typography } from "@tetherto/mdk-react-devkit/core";

// ─── API response shapes (served by the full-site app-node plugin) ──────────

type Miner = {
  deviceId: string;
  code: string;
  container: string;
  pos: string;
  status: string;
  powerMode: string | null;
  hashrateMhs: number;
  powerW: number;
  temperature: number;
};

type Overview = {
  ts: number;
  container: { deviceId: string; id: string; operatingStatus: string; powerW: number; ambientTempC: number } | null;
  site: { powerW: number; tensionV: number; currentA: number };
  pool: {
    deviceId: string;
    name: string;
    poolType: string;
    status: string;
    hashrate: number;
    hashrate24h: number;
    workersOnline: number;
    balanceBtc: number;
    revenue24hBtc: number;
  } | null;
  miners: Miner[];
  totals: { hashrateMhs: number; powerW: number; minerCount: number; onlineCount: number };
};

type HistoryPoint = { ts: number; value: number };
type History = { metric: string; unit: string; log: HistoryPoint[] };

type SocketMiner = Parameters<typeof Socket>[0]["miner"];

// Real Whatsminer power modes (sleep omitted — it powers the miner down).
const MODES = ["low", "normal", "high"];
const MHS_PER_PHS = 1e9; // MH/s per PH/s
const HS_PER_THS = 1e12; // H/s per TH/s (pool reports hashrate in H/s)

// ─── helpers ────────────────────────────────────────────────────────────────

function get<T>(base: string, path: string) {
  return fetch(`${base}${path}`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });
}

// Group miners into PDU columns by the prefix of info.pos ("<pdu>_<socket>").
function groupByPdu(miners: Miner[]) {
  const groups: Record<string, Miner[]> = {};
  for (const m of miners) {
    const sep = m.pos.lastIndexOf("_");
    const pdu = sep === -1 ? m.pos : m.pos.slice(0, sep);
    (groups[pdu] ||= []).push(m);
  }
  for (const pdu of Object.keys(groups)) {
    groups[pdu].sort((a, b) => Number(a.pos.split("_").pop()) - Number(b.pos.split("_").pop()));
  }
  return groups;
}

// Shape a miner into the structure <Socket> reads (snap.stats / snap.config).
function toSocketMiner(m: Miner): SocketMiner {
  const snap = {
    stats: { status: m.status, hashrate_mhs: { t_5m: m.hashrateMhs } },
    config: { power_mode: m.powerMode ?? "normal" },
  };
  return { snap, last: { snap }, temperature: { chip: m.temperature } } as unknown as SocketMiner;
}

function toChartData(history: History | undefined, color: string, unit: string, scale = 1): LineChartCardData {
  // LineChartCard converts x→seconds internally (x / 1000), so x must be the
  // millisecond timestamp. It also needs strictly-ascending unique seconds, so
  // collapse any points that share a second (keeping the latest ms in it).
  const bySecond = new Map<number, { x: number; y: number }>();
  for (const p of history?.log ?? []) bySecond.set(Math.floor(p.ts / 1000), { x: p.ts, y: p.value / scale });
  const points = [...bySecond.values()].sort((a, b) => a.x - b.x);
  const latest = points.length ? points[points.length - 1].y : 0;
  return {
    datasets: [{ label: history?.metric ?? "", borderColor: color, data: points }],
    highlightedValue: { value: latest.toFixed(2), unit },
    yTicksFormatter: (v: number) => v.toFixed(2),
  };
}

// ─── page ─────────────────────────────────────────────────────────────────

export function SitePage(): JSX.Element {
  const { apiBaseUrl } = useMdkContext();
  const base = apiBaseUrl ?? "";
  const [selectedMiner, setSelectedMiner] = useState("miner-0");
  const [selectedMode, setSelectedMode] = useState("high");
  const [actionMsg, setActionMsg] = useState("");

  const overview = useQuery({
    queryKey: ["site-overview"],
    queryFn: () => get<Overview>(base, "/site/overview"),
    refetchInterval: 3000,
  });

  const hashHistory = useQuery({
    queryKey: ["site-history", "hashrate"],
    queryFn: () => get<History>(base, "/site/history?metric=hashrate"),
    refetchInterval: 10000,
  });

  const powerHistory = useQuery({
    queryKey: ["site-history", "power"],
    queryFn: () => get<History>(base, "/site/history?metric=power"),
    refetchInterval: 10000,
  });

  const data = overview.data;
  const pduGroups = useMemo(() => groupByPdu(data?.miners ?? []), [data?.miners]);

  const poolRows: MiningPoolRow[] = data?.pool
    ? [{
        id: data.pool.deviceId,
        name: data.pool.name,
        revenue24hBtc: data.pool.revenue24hBtc,
        hashratePhs: data.pool.hashrate / HS_PER_THS / 1000,
        details: [
          { title: "Status", value: data.pool.status },
          { title: "Type", value: data.pool.poolType },
          { title: "Hashrate", value: `${(data.pool.hashrate / HS_PER_THS).toFixed(1)} TH/s` },
          { title: "Workers online", value: data.pool.workersOnline },
        ],
      }]
    : [];

  async function applyAction() {
    setActionMsg("Dispatching…");
    try {
      const res = await fetch(`${base}/site/miners/${selectedMiner}/command`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: selectedMode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
      setActionMsg(`${selectedMiner} → ${selectedMode} (${body.status})`);
      overview.refetch();
    } catch (err) {
      setActionMsg(`Failed: ${(err as Error).message}`);
    }
  }

  if (!data) {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 32 }}>
        <Spinner />
        <Typography>Connecting to the site… (start the backend with <code>node start.js</code>)</Typography>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1200, margin: "0 auto" }}>
      <Typography variant="heading2">MDK Full Site — real workers over the RPC gateway</Typography>

      {/* Header KPI strip */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
        <HeaderConsumptionBox valueMw={(data.container?.powerW ?? 0) / 1e6} />
        <MetricCard label="Miners online" unit={`/ ${data.totals.minerCount}`} value={data.totals.onlineCount} />
        <MetricCard label="Site hashrate" unit="PH/s" value={(data.totals.hashrateMhs / MHS_PER_PHS).toFixed(2)} />
        <MetricCard label="Site meter" unit="W" value={data.site.powerW.toFixed(1)} />
        <MetricCard label="Pool 24h" unit="BTC" value={(data.pool?.revenue24hBtc ?? 0).toFixed(4)} />
      </div>

      {/* Container with linked miners */}
      <section style={{ background: "#141414", borderRadius: 12, padding: 16 }}>
        <Typography variant="heading3">
          Container {data.container?.id ?? "—"} · {data.container?.operatingStatus ?? "—"} · {data.miners.length} miners
        </Typography>
        <div data-testid="container-grid" style={{ display: "flex", gap: 16, marginTop: 12, overflowX: "auto" }}>
          {Object.entries(pduGroups).map(([pdu, miners]) => (
            <div key={pdu} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Typography variant="caption">PDU {pdu}</Typography>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {miners.map((m) => (
                  <Socket
                    key={m.deviceId}
                    socket={Number(m.pos.split("_").pop())}
                    enabled
                    power_w={m.powerW}
                    miner={toSocketMiner(m)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Historical charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <LineChartCard
          title="Pool hashrate (history)"
          data={toChartData(hashHistory.data, "#f5a623", "TH/s", HS_PER_THS)}
          isLoading={hashHistory.isLoading}
          minHeight={240}
        />
        <LineChartCard
          title="Site power (history)"
          data={toChartData(powerHistory.data, "#4a90e2", "W")}
          isLoading={powerHistory.isLoading}
          minHeight={240}
        />
      </div>

      {/* Pool */}
      <MiningPoolsPanel rows={poolRows} isLoading={!data.pool} />

      {/* Live miner action */}
      <section style={{ background: "#141414", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="heading3">Miner action</Typography>
        <select value={selectedMiner} onChange={(e) => setSelectedMiner(e.target.value)} data-testid="miner-select">
          {data.miners.map((m) => (
            <option key={m.deviceId} value={m.deviceId}>{m.deviceId} ({m.powerMode})</option>
          ))}
        </select>
        <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)} data-testid="mode-select">
          {MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
        </select>
        <Button onClick={applyAction} data-testid="apply-action">Set power mode</Button>
        {actionMsg && <Typography data-testid="action-msg">{actionMsg}</Typography>}
      </section>
    </div>
  );
}
