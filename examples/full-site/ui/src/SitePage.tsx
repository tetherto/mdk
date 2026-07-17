import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useMdkContext, useQuery } from "@tetherto/mdk-react-adapter";
import {
  AlarmsBellButton,
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
  HeaderHashrateBox,
  HeaderMinersBox,
  HeaderStatsBar,
  type MiningPoolRow,
  ProfileMenu,
  type TIncidentRowProps,
} from "@tetherto/mdk-react-devkit/domain";
import { AppHeader, MiningStatusIcon, Spinner, Typography } from "@tetherto/mdk-react-devkit/primitives";

import { AppSidebar } from "./AppSidebar";
import { HS_PER_PHS, HS_PER_THS, MHS_PER_PHS, NOMINAL_MHS_PER_MINER } from "./constants";
import { ContainerDetailPage, ContainersListPage } from "./ContainersPage";
import { ControlPage } from "./ControlPage";
import { DashboardPage } from "./DashboardPage";
import { MonitoringPage } from "./MonitoringPage";
import { PoolsPage } from "./PoolsPage";
import type { Container, History, Overview } from "./types";
import { get, powerModesForDevice } from "./utils";

function formatStamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function SitePage(): JSX.Element {
  const { apiBaseUrl } = useMdkContext();
  const base = apiBaseUrl ?? "";
  const [selectedMiner, setSelectedMiner] = useState("");
  const [selectedMode, setSelectedMode] = useState("normal");
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

  const data = overview.data;

  const minersByContainer = useMemo(() => {
    const map = new Map<string, Overview["miners"][number][]>();
    for (const m of data?.miners ?? []) {
      const key = m.container || "__unassigned__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [data?.miners]);

  const containerSections = useMemo(() => {
    const sections = [...(data?.containers ?? [])];
    const known = new Set(sections.map((c) => c.id));
    for (const [key, miners] of minersByContainer) {
      if (key === "__unassigned__" || known.has(key)) continue;
      sections.push({
        deviceId: key,
        id: key,
        code: key,
        operatingStatus: "unknown",
        powerW: miners.reduce((sum, m) => sum + m.powerW, 0),
        ambientTempC: 0,
        inletTempC: 0,
        minerCount: miners.length,
      } satisfies Container);
    }
    return sections.sort((a, b) => a.id.localeCompare(b.id));
  }, [data?.containers, minersByContainer]);

  useEffect(() => {
    if (data?.miners.length && !selectedMiner) {
      setSelectedMiner(data.miners[0].deviceId);
    }
  }, [data?.miners, selectedMiner]);

  const modeOptions = useMemo(
    () => (selectedMiner ? [...powerModesForDevice(selectedMiner)] : ["normal"]),
    [selectedMiner],
  );

  useEffect(() => {
    if (!selectedMiner || modeOptions.length === 0) return;
    setSelectedMode((prev) => {
      if (modeOptions.includes(prev)) return prev;
      const miner = data?.miners.find((m) => m.deviceId === selectedMiner);
      const current = miner?.powerMode?.toLowerCase();
      if (current && modeOptions.includes(current)) return current;
      return modeOptions[0];
    });
  }, [selectedMiner, modeOptions, data?.miners]);

  const containerPowerMw = useMemo(
    () => (data?.containers ?? []).reduce((sum, c) => sum + c.powerW, 0) / 1e6,
    [data?.containers],
  );

  const minerCounts = useMemo(() => {
    const miners = data?.miners ?? [];
    const HEALTHY = new Set(["online", "mining", "active", "normal", "running"]);
    let online = 0;
    let error = 0;
    let offline = 0;
    for (const m of miners) {
      const s = (m.status || "").toLowerCase();
      if (HEALTHY.has(s)) online++;
      else if (s === "offline") offline++;
      else error++;
    }
    return { total: data?.totals.minerCount ?? miners.length, online, error, offline };
  }, [data?.miners, data?.totals.minerCount]);

  const mosPhs = (data?.totals.hashrateMhs ?? 0) / MHS_PER_PHS;
  const poolPhs = useMemo(
    () => (data?.pools ?? []).reduce((sum, p) => sum + p.hashrate, 0) / HS_PER_PHS,
    [data?.pools],
  );

  const efficiencyWthS = useMemo(() => {
    const ths = (data?.totals.hashrateMhs ?? 0) / 1e6;
    return ths > 0 ? (containerPowerMw * 1e6) / ths : 0;
  }, [data?.totals.hashrateMhs, containerPowerMw]);

  const nominalPhs = ((data?.totals.minerCount ?? 0) * NOMINAL_MHS_PER_MINER) / MHS_PER_PHS;

  const incidents = useMemo<TIncidentRowProps[]>(() => {
    const out: TIncidentRowProps[] = [];
    const stamp = formatStamp(data?.ts ?? 0);
    for (const m of data?.miners ?? []) {
      if (m.temperature > 70) {
        out.push({
          id: `temp-${m.deviceId}`,
          severity: "high",
          title: "temperature_alarm",
          body: `Cooling-loop temperature above alarm threshold — ${m.code}: ${m.temperature.toFixed(1)}°C (threshold 70°C)`,
          subtitle: stamp,
        });
      }
    }
    for (const m of data?.miners ?? []) {
      const s = (m.status || "").toLowerCase();
      if (s === "offline") {
        out.push({
          id: `off-${m.deviceId}`,
          severity: "critical",
          title: "offline_alarm",
          body: `Miner not reporting — ${m.code} (${m.container})`,
          subtitle: stamp,
        });
      }
    }
    return out.slice(0, 20);
  }, [data?.miners, data?.ts]);

  const alarmCounts = useMemo(
    () =>
      incidents.reduce(
        (acc, i) => {
          acc[i.severity] = (acc[i.severity] ?? 0) + 1;
          return acc;
        },
        { critical: 0, high: 0, medium: 0 } as Record<TIncidentRowProps["severity"], number>,
      ),
    [incidents],
  );

  const allContainers = useMemo(() => {
    const unassigned = minersByContainer.get("__unassigned__") ?? [];
    if (!unassigned.length) return containerSections;
    const unassignedEntry: Container = {
      deviceId: "__unassigned__",
      id: "__unassigned__",
      code: "unassigned",
      operatingStatus: "unknown",
      powerW: 0,
      ambientTempC: 0,
      inletTempC: 0,
      minerCount: unassigned.length,
    };
    return [...containerSections, unassignedEntry];
  }, [containerSections, minersByContainer]);

  const poolRows: MiningPoolRow[] = (data?.pools ?? []).map((pool) => ({
    id: pool.deviceId,
    name: pool.name,
    revenue24hBtc: pool.revenue24hBtc,
    hashratePhs: pool.hashrate / HS_PER_THS / 1000,
    details: [
      { title: "Status", value: pool.status },
      { title: "Type", value: pool.poolType },
      { title: "Hashrate", value: `${(pool.hashrate / HS_PER_THS).toFixed(1)} TH/s` },
      { title: "Workers online", value: pool.workersOnline },
    ],
  }));

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

  const logo = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#f7931a", display: "inline-flex" }}>
        <MiningStatusIcon />
      </span>
      <Typography variant="heading3" style={{ color: "#fff", fontWeight: 700 }}>
        MDK Site
      </Typography>
    </div>
  );

  const actions = (
    <>
      <AlarmsBellButton counts={alarmCounts} />
      <ProfileMenu user="operator@example.com" items={[]} />
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <AppHeader logo={logo} actions={actions}>
        <HeaderStatsBar>
          <HeaderMinersBox
            total={minerCounts.total}
            online={minerCounts.online}
            error={minerCounts.error}
            offline={minerCounts.offline}
            mosTotal={minerCounts.total}
            poolTotal={data.pools.length}
            poolOnline={0}
            poolMismatch={0}
          />
          <HeaderHashrateBox mosPhs={mosPhs} poolPhs={poolPhs} />
          <HeaderConsumptionBox valueMw={containerPowerMw} />
          <HeaderEfficiencyBox valueWthS={efficiencyWthS} />
        </HeaderStatsBar>
      </AppHeader>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <AppSidebar />

        <main style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 20, minWidth: 0, overflowY: "auto" }}>
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  hashHistory={hashHistory.data}
                  mosPhs={mosPhs}
                  containerPowerMw={containerPowerMw}
                  nominalPhs={nominalPhs}
                  nowTs={data.ts}
                  incidents={incidents}
                  incidentsLoading={false}
                  poolRows={poolRows}
                  poolsLoading={poolRows.length === 0}
                />
              }
            />
            <Route
              path="/containers"
              element={<ContainersListPage allContainers={allContainers} minersByContainer={minersByContainer} />}
            />
            <Route
              path="/containers/:containerId"
              element={<ContainerDetailPage allContainers={allContainers} minersByContainer={minersByContainer} />}
            />
            <Route
              path="/monitoring"
              element={<MonitoringPage base={base} powermeters={data.powermeters ?? []} sensors={data.sensors ?? []} />}
            />
            <Route path="/pools" element={<PoolsPage poolRows={poolRows} />} />
            <Route
              path="/control"
              element={
                <ControlPage
                  miners={data.miners}
                  selectedMiner={selectedMiner}
                  setSelectedMiner={setSelectedMiner}
                  selectedMode={selectedMode}
                  setSelectedMode={setSelectedMode}
                  modeOptions={modeOptions}
                  applyAction={applyAction}
                  actionMsg={actionMsg}
                />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
