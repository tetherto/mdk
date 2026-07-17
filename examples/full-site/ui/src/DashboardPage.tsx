import {
  ActiveIncidentsCard,
  LineChartCard,
  MiningPoolsPanel,
  type LineChartCardData,
  type MiningPoolRow,
  type TIncidentRowProps,
} from "@tetherto/mdk-react-devkit/domain";
import { Divider } from "@tetherto/mdk-react-devkit/primitives";

import {
  DASHBOARD_TIMELINE_OPTIONS,
  HASH_SERIES_COLORS,
  HS_PER_PHS,
  POWER_SERIES_COLOR,
} from "./constants";
import type { History } from "./types";
import { flatLine, historyToPoints } from "./utils";

const HALF_HOUR_MS = 30 * 60 * 1000;

// x-range for flat reference lines: span the real history when present,
// otherwise a 30-min window ending "now" so the line still renders.
function xRange(points: { x: number }[], nowTs: number): [number, number] {
  if (points.length) return [points[0].x, points[points.length - 1].x];
  return [nowTs - HALF_HOUR_MS, nowTs];
}

function hashChartData(
  hashHistory: History | undefined,
  mosPhs: number,
  nominalPhs: number,
  nowTs: number,
): LineChartCardData {
  // Real, time-varying series available from the backend: aggregate pool hashrate.
  const aggrPool = historyToPoints(hashHistory, HS_PER_PHS);
  const [x0, x1] = xRange(aggrPool, nowTs);
  const aggrLatest = aggrPool.length ? aggrPool[aggrPool.length - 1].y : 0;
  const fmt = (v: number) => `${v.toFixed(2)} PH/s`;

  return {
    datasets: [
      {
        label: "Site Hash Rate",
        borderColor: HASH_SERIES_COLORS.mdkFullSite,
        data: flatLine(x0, x1, mosPhs),
        currentValue: { value: mosPhs.toFixed(2), unit: "PH/s" },
      },
      {
        label: "Aggr Pool Hash Rate",
        borderColor: HASH_SERIES_COLORS.aggrPool,
        data: aggrPool,
        currentValue: { value: aggrLatest.toFixed(2), unit: "PH/s" },
      },
      {
        label: "F2pool Hash Rate",
        borderColor: HASH_SERIES_COLORS.f2pool,
        data: flatLine(x0, x1, 0),
        currentValue: { value: 0, unit: "PH/s" },
      },
      {
        label: "Ocean Hash Rate",
        borderColor: HASH_SERIES_COLORS.ocean,
        data: flatLine(x0, x1, 0),
        currentValue: { value: 0, unit: "PH/s" },
      },
      {
        label: "Nominal Hash Rate",
        borderColor: HASH_SERIES_COLORS.nominal,
        data: flatLine(x0, x1, nominalPhs),
        currentValue: { value: nominalPhs.toFixed(0), unit: "PH/s" },
      },
    ],
    minMaxAvg: { min: fmt(mosPhs), max: fmt(mosPhs), avg: fmt(mosPhs) },
    yTicksFormatter: (v: number) => `${v.toFixed(0)} PH/s`,
  };
}

function powerChartData(containerPowerMw: number, nowTs: number): LineChartCardData {
  // Total container consumption. The example backend exposes only the
  // current aggregate (no per-container tail-log), so this renders as a flat
  // reference line at the live value — the same treatment the target uses.
  const [x0, x1] = xRange([], nowTs);
  const fmt = (v: number) => `${v.toFixed(2)} MW`;
  return {
    datasets: [
      {
        label: "Total Consumption",
        borderColor: POWER_SERIES_COLOR,
        data: flatLine(x0, x1, containerPowerMw),
        currentValue: { value: containerPowerMw.toFixed(2), unit: "MW" },
      },
    ],
    minMaxAvg: { min: fmt(containerPowerMw), max: fmt(containerPowerMw), avg: fmt(containerPowerMw) },
    highlightedValue: { value: containerPowerMw.toFixed(2), unit: "MW" },
    yTicksFormatter: (v: number) => `${v.toFixed(2)} MW`,
  };
}

export function DashboardPage({
  hashHistory,
  mosPhs,
  containerPowerMw,
  nominalPhs,
  nowTs,
  incidents,
  incidentsLoading,
  poolRows,
  poolsLoading,
}: {
  hashHistory: History | undefined;
  mosPhs: number;
  containerPowerMw: number;
  nominalPhs: number;
  nowTs: number;
  incidents: TIncidentRowProps[];
  incidentsLoading: boolean;
  poolRows: MiningPoolRow[];
  poolsLoading: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <LineChartCard
        title="Hash Rate"
        data={hashChartData(hashHistory, mosPhs, nominalPhs, nowTs)}
        timelineOptions={DASHBOARD_TIMELINE_OPTIONS}
        defaultTimeline="5m"
        detailLegends
        isLoading={hashHistory === undefined}
        minHeight={280}
      />

      <Divider />

      <LineChartCard
        title="Power Consumption"
        data={powerChartData(containerPowerMw, nowTs)}
        timelineOptions={DASHBOARD_TIMELINE_OPTIONS}
        defaultTimeline="5m"
        minHeight={280}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        <ActiveIncidentsCard label="Active Alerts" items={incidents} isLoading={incidentsLoading} emptyMessage="No active alerts" />
        <MiningPoolsPanel rows={poolRows} isLoading={poolsLoading} />
      </div>
    </div>
  );
}
