import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";

import { useMdkContext, useQuery, useQueryClient } from "@tetherto/mdk-react-adapter";
import {
  AlarmsBellButton,
  getHashrateString,
  getHashrateUnit,
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
  HeaderHashrateBox,
  HeaderMinersBox,
  HeaderStatsBar,
  type MiningPoolRow,
  ProfileMenu,
  type TIncidentRowProps,
} from "@tetherto/mdk-react-devkit/domain";
import {
  AppHeader,
  Button,
  HASHRATE_LABEL_DIVISOR,
  MiningStatusIcon,
  SignOutIcon,
  Spinner,
  Typography,
} from "@tetherto/mdk-react-devkit/primitives";

import { ActivityPage } from "./ActivityPage";
import { AppSidebar } from "./AppSidebar";
import { auth, errorMessage, post } from "./auth";
import { HS_PER_MHS, HS_PER_THS, NOMINAL_MHS_PER_MINER, W_PER_MW } from "./constants";
import { ContainerDetailPage, ContainersListPage } from "./ContainersPage";
import { ControlPage } from "./ControlPage";
import { DashboardPage } from "./DashboardPage";
import { MinersPage } from "./MinersPage";
import { MonitoringPage } from "./MonitoringPage";
import { permissionsFrom } from "./permissions";
import { PoolsPage } from "./PoolsPage";
import type { Access, Container, History, Overview, PoolInput } from "./types";
import { get, powerModesForMiner } from "./utils";

function formatStamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Cooling-loop temperature at which a miner raises a high-severity alarm. */
const TEMP_ALARM_C = 70;

export function SitePage(): JSX.Element {
  const navigate = useNavigate();
  const { apiBaseUrl } = useMdkContext();
  const base = apiBaseUrl ?? "";
  const [selectedMiner, setSelectedMiner] = useState("");
  const [selectedMode, setSelectedMode] = useState("normal");
  const [actionMsg, setActionMsg] = useState("");
  const [poolsMsg, setPoolsMsg] = useState("");
  const queryClient = useQueryClient();

  // What the signed-in user may do: which pages and actions to offer.
  const access = useQuery({
    queryKey: ["site-access"],
    queryFn: () => get<Access>(base, "/site/access"),
    refetchInterval: 30000,
  });
  const permissions = useMemo(() => permissionsFrom(access.data), [access.data]);

  function signOut() {
    // The next user must not see this one's cached data.
    queryClient.clear();
    auth.signOut();
  }

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

  const siteHashHistory = useQuery({
    queryKey: ["site-history", "site-hashrate"],
    queryFn: () => get<History>(base, "/site/history?metric=site-hashrate"),
    refetchInterval: 10000,
  });

  const data = overview.data;

  const oceanPoolId = data?.pools.find((p) => p.poolType === "ocean")?.deviceId;
  const oceanHistory = useQuery({
    queryKey: ["site-history", "hashrate", oceanPoolId],
    queryFn: () => get<History>(base, `/site/history?metric=hashrate&deviceId=${encodeURIComponent(oceanPoolId ?? "")}`),
    refetchInterval: 10000,
    enabled: !!oceanPoolId,
  });

  const powerHistory = useQuery({
    queryKey: ["site-history", "power"],
    queryFn: () => get<History>(base, "/site/history?metric=power"),
    refetchInterval: 10000,
  });

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

  // Start on a miner the user may act on, when there is one. Waits for
  // /site/access to settle (even if it fails), since the choice sticks.
  useEffect(() => {
    if (data?.miners.length && !selectedMiner && access.isFetched) {
      const ids = data.miners.map((m) => m.deviceId);
      const own = ids.find((id) => permissions.powerModeMiners.has(id) || permissions.poolMiners.has(id));
      setSelectedMiner(own ?? ids[0]);
    }
  }, [data?.miners, selectedMiner, permissions, access.isFetched]);

  const modeOptions = useMemo(
    () => [...powerModesForMiner(data?.miners.find((m) => m.deviceId === selectedMiner))],
    [selectedMiner, data?.miners],
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

  // Site powermeters are authoritative; the container-reported sum is the fallback.
  const consumptionMw = useMemo(() => {
    const siteW = data?.site.powerW ?? 0;
    const containerW = (data?.containers ?? []).reduce((sum, c) => sum + c.powerW, 0);
    return (siteW > 0 ? siteW : containerW) / W_PER_MW;
  }, [data?.site.powerW, data?.containers]);

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

  const siteMhs = data?.totals.hashrateMhs ?? 0;
  const poolMhs = useMemo(
    () => (data?.pools ?? []).reduce((sum, p) => sum + p.hashrate, 0) / HS_PER_MHS,
    [data?.pools],
  );

  // One dynamic unit shared by both header rows, picked from the larger value.
  const headerHashrate = useMemo(() => {
    const { unit } = getHashrateUnit(Math.max(siteMhs, poolMhs));
    const divisor = HASHRATE_LABEL_DIVISOR[unit as keyof typeof HASHRATE_LABEL_DIVISOR] ?? 1;
    return { unit, site: siteMhs / divisor, pool: poolMhs / divisor };
  }, [siteMhs, poolMhs]);

  const efficiencyWthS = useMemo(() => {
    const ths = siteMhs / 1e6;
    return ths > 0 ? (consumptionMw * W_PER_MW) / ths : 0;
  }, [siteMhs, consumptionMw]);

  const nominalMhs = (data?.totals.minerCount ?? 0) * NOMINAL_MHS_PER_MINER;

  const incidents = useMemo<TIncidentRowProps[]>(() => {
    const out: TIncidentRowProps[] = [];
    const stamp = formatStamp(data?.ts ?? 0);
    for (const m of data?.miners ?? []) {
      // At the threshold counts as reaching it. The mocks park two sealminers
      // on exactly 70.0C, so a strict `>` left them silent while the alarm text
      // named 70C as the threshold - 8 alarms for 10 miners, with no visible
      // reason for the two that were missing.
      if (m.temperature >= TEMP_ALARM_C) {
        out.push({
          id: `temp-${m.deviceId}`,
          severity: "high",
          title: "temperature_alarm",
          body: `Cooling-loop temperature at or above alarm threshold — ${m.code}: ${m.temperature.toFixed(1)}°C (threshold ${TEMP_ALARM_C}°C)`,
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

  // Only the severities that actually have an incident. AlarmsBellButton hides
  // a row whose count is undefined ("omit to hide the row"), so seeding all
  // three at 0 forced two permanently-dead rows into the badge: nothing here
  // ever raises `medium`, and `critical` only when a miner stops reporting.
  // Three unexplained digits, of which one ever moved.
  const alarmCounts = useMemo(
    () =>
      incidents.reduce<Partial<Record<TIncidentRowProps["severity"], number>>>((acc, i) => {
        acc[i.severity] = (acc[i.severity] ?? 0) + 1;
        return acc;
      }, {}),
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
      { title: "Hashrate", value: getHashrateString(pool.hashrate / HS_PER_MHS) },
      { title: "Workers online", value: pool.workersOnline },
    ],
  }));

  async function applyAction() {
    setActionMsg("Dispatching…");
    try {
      const body = await post<{ status: string }>(base, `/site/miners/${selectedMiner}/command`, { mode: selectedMode });
      setActionMsg(`${selectedMiner} → ${selectedMode} (${body.status})`);
      overview.refetch();
    } catch (err) {
      setActionMsg(`Failed: ${errorMessage(err)}`);
    }
  }

  async function applyPools(pool: PoolInput | null) {
    if (pool && (!pool.url || !pool.worker_name)) {
      setPoolsMsg("Enter both pool URL and worker name, or leave all fields empty for the config default.");
      return;
    }
    setPoolsMsg("Dispatching…");
    try {
      const body = await post<{ status: string; pools: string[] }>(
        base,
        `/site/miners/${selectedMiner}/pools`,
        pool ? { pools: [pool] } : {},
      );
      setPoolsMsg(`${selectedMiner} → ${body.pools.join(", ")} (${body.status})`);
      overview.refetch();
    } catch (err) {
      setPoolsMsg(`Failed: ${errorMessage(err)}`);
    }
  }

  if (!data) {
    return (
      <div className="site-shell__loading">
        {overview.error ? (
          <>
            <Typography>Could not load the site: {errorMessage(overview.error)}</Typography>
            <Button onClick={signOut}>Sign out</Button>
          </>
        ) : (
          <>
            <Spinner />
            <Typography>Connecting to the site… (start the backend with <code>npm start</code>)</Typography>
          </>
        )}
      </div>
    );
  }

  const logo = (
    <div className="site-shell__brand">
      <span className="site-brand-mark">
        <MiningStatusIcon />
      </span>
      <Typography variant="heading3" className="site-shell__brand-name">
        MDK Site
      </Typography>
    </div>
  );

  const actions = (
    <>
      {/* Both handlers route to the Dashboard, where ActiveIncidentsCard lists
          the very alarms these numbers count. onSeverityClick also makes each
          row a real button with an `aria-label`; without it the devkit renders
          the badge `aria-hidden` as plain text, so the counts were unreachable
          and unexplained. */}
      <AlarmsBellButton
        counts={alarmCounts}
        onClick={() => void navigate("/dashboard")}
        onSeverityClick={() => void navigate("/dashboard")}
      />
      <ProfileMenu
        user={
          access.data ? (
            <span data-testid="profile-user">
              {access.data.user.sub}
              <br />
              <small className="site-muted">{access.data.roles.join(", ") || "no roles"}</small>
            </span>
          ) : undefined
        }
        items={[{ label: "Sign out", onSelect: signOut, danger: true, icon: <SignOutIcon /> }]}
      />
    </>
  );

  return (
    <div className="site-shell">
      <AppHeader logo={logo} actions={actions}>
        <HeaderStatsBar>
          <HeaderMinersBox
            total={minerCounts.total}
            online={minerCounts.online}
            error={minerCounts.error}
            offline={minerCounts.offline}
            appTotal={minerCounts.total}
            poolTotal={data.pools.length}
            poolOnline={0}
            poolMismatch={0}
          />
          <HeaderHashrateBox appPhs={headerHashrate.site} poolPhs={headerHashrate.pool} unit={headerHashrate.unit} />
          <HeaderConsumptionBox valueMw={consumptionMw} />
          <HeaderEfficiencyBox valueWthS={efficiencyWthS} />
        </HeaderStatsBar>
      </AppHeader>

      <div className="site-shell__body">
        <AppSidebar pages={permissions.pages} />

        <main className="site-shell__main">
          {data.unavailableWorkers?.length ? (
            <div className="site-unavailable" role="alert">
              {data.unavailableWorkers.length === 1 ? "1 Worker is down, so its devices are" : `${data.unavailableWorkers.length} Workers are down, so their devices are`}{" "}
              missing from this view: {data.unavailableWorkers.map((w) => `${w.workerId} (${w.reason})`).join(", ")}
              {data.unavailableDevices?.length ? `. Offline devices: ${data.unavailableDevices.map((d) => d.deviceId).join(", ")}` : null}
            </div>
          ) : null}
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  hashHistory={hashHistory.data}
                  siteHashHistory={siteHashHistory.data}
                  oceanHistory={oceanHistory.data}
                  powerHistory={powerHistory.data}
                  siteMhs={siteMhs}
                  consumptionMw={consumptionMw}
                  nominalMhs={nominalMhs}
                  nowTs={data.ts}
                  incidents={incidents}
                  incidentsLoading={false}
                  poolRows={poolRows}
                  poolsLoading={false}
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
            <Route path="/miners" element={<MinersPage miners={data.miners} />} />
            <Route
              path="/monitoring"
              element={<MonitoringPage base={base} powermeters={data.powermeters ?? []} sensors={data.sensors ?? []} />}
            />
            <Route path="/pools" element={<PoolsPage poolRows={poolRows} />} />
            <Route
              path="/control"
              element={
                access.data && !permissions.pages.control ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <ControlPage
                    miners={data.miners}
                    access={access.data}
                    permissions={permissions}
                    selectedMiner={selectedMiner}
                    setSelectedMiner={setSelectedMiner}
                    selectedMode={selectedMode}
                    setSelectedMode={setSelectedMode}
                    modeOptions={modeOptions}
                    applyAction={applyAction}
                    actionMsg={actionMsg}
                    applyPools={applyPools}
                    poolsMsg={poolsMsg}
                  />
                )
              }
            />
            <Route
              path="/activity"
              element={
                access.data && !permissions.pages.activity ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <ActivityPage base={base} miners={data.miners} />
                )
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
