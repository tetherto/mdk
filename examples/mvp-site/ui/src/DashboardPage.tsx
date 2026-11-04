import {
  ActiveIncidentsCard,
  formatPowerConsumption,
  getHashrateString,
  getHashrateUnit,
  LineChartCard,
  MiningPoolsPanel,
  type LineChartCardData,
  type MiningPoolRow,
  type TIncidentRowProps,
} from "@tetherto/mdk-react-devkit/domain";
import { Divider, formatHashrateUnit, HASHRATE_LABEL_DIVISOR } from "@tetherto/mdk-react-devkit/primitives";

import {
  DASHBOARD_TIMELINE_OPTIONS,
  HASH_SERIES_COLORS,
  HS_PER_MHS,
  POWER_SERIES_COLOR,
  W_PER_MW,
} from "./constants";
import type { History } from "./types";
import { flatLine, historyToPoints, type XYPoint } from "./utils";

const HALF_HOUR_MS = 30 * 60 * 1000;

// x-range for flat reference lines: span the real history when present,
// otherwise a 30-min window ending "now" so the line still renders.
function xRange(points: { x: number }[], nowTs: number): [number, number] {
  if (points.length) return [points[0].x, points[points.length - 1].x];
  return [nowTs - HALF_HOUR_MS, nowTs];
}

function hashChartData(
  hashHistory: History | undefined,
  siteHashHistory: History | undefined,
  oceanHistory: History | undefined,
  siteMhs: number,
  nominalMhs: number,
  nowTs: number,
): LineChartCardData {
  // site-hashrate history is MH/s; pool histories are H/s.
  const siteSeries = historyToPoints(siteHashHistory);
  const siteLatest = siteSeries.length ? siteSeries[siteSeries.length - 1].y : siteMhs;
  const aggrPool = historyToPoints(hashHistory, HS_PER_MHS);
  const [x0, x1] = xRange(siteSeries.length ? siteSeries : aggrPool, nowTs);
  const aggrLatest = aggrPool.length ? aggrPool[aggrPool.length - 1].y : 0;
  const oceanPool = historyToPoints(oceanHistory, HS_PER_MHS);
  const oceanLatest = oceanPool.length ? oceanPool[oceanPool.length - 1].y : 0;

  // One dynamic axis unit picked from the chart's largest magnitude.
  const maxMhs = [siteMhs, nominalMhs, ...siteSeries.map((p) => p.y), ...aggrPool.map((p) => p.y), ...oceanPool.map((p) => p.y)]
    .reduce((max, v) => Math.max(max, v), 0);
  const axisUnit = getHashrateUnit(maxMhs).unit;
  const divisor = HASHRATE_LABEL_DIVISOR[axisUnit as keyof typeof HASHRATE_LABEL_DIVISOR] ?? 1;
  const toAxis = (points: XYPoint[]) => points.map((p) => ({ x: p.x, y: p.y / divisor }));
  const currentValue = (mhs: number) => {
    const u = getHashrateUnit(mhs, 2);
    return { value: u.value ?? 0, unit: u.unit };
  };

  return {
    datasets: [
      {
        label: "Site Hash Rate",
        borderColor: HASH_SERIES_COLORS.mdkFullSite,
        data: siteSeries.length ? toAxis(siteSeries) : flatLine(x0, x1, siteMhs / divisor),
        currentValue: currentValue(siteLatest),
      },
      {
        label: "Aggr Pool Hash Rate",
        borderColor: HASH_SERIES_COLORS.aggrPool,
        data: toAxis(aggrPool),
        currentValue: currentValue(aggrLatest),
      },
      {
        label: "Ocean Hash Rate",
        borderColor: HASH_SERIES_COLORS.ocean,
        data: oceanPool.length ? toAxis(oceanPool) : flatLine(x0, x1, 0),
        currentValue: currentValue(oceanLatest),
      },
      {
        label: "Nominal Hash Rate",
        borderColor: HASH_SERIES_COLORS.nominal,
        data: flatLine(x0, x1, nominalMhs / divisor),
        currentValue: currentValue(nominalMhs),
      },
    ],
    minMaxAvg: {
      min: getHashrateString(siteSeries.length ? Math.min(...siteSeries.map((p) => p.y)) : siteMhs),
      max: getHashrateString(siteSeries.length ? Math.max(...siteSeries.map((p) => p.y)) : siteMhs),
      avg: getHashrateString(siteSeries.length ? siteSeries.reduce((s, p) => s + p.y, 0) / siteSeries.length : siteMhs),
    },
    yTicksFormatter: (v: number) => formatHashrateUnit({ value: v, unit: axisUnit }),
  };
}

function powerChartData(
  powerHistory: History | undefined,
  consumptionMw: number,
  nowTs: number,
): LineChartCardData {
  // Work in watts — the unit the history arrives in — and pick the axis unit
  // from the magnitude, the same way the hash-rate chart above does. Pinning
  // the axis to MW labelled a 35 kW demo site "0.03 MW" at every tick, which
  // lightweight-charts then dropped as duplicates, leaving no axis at all.
  const series: XYPoint[] = historyToPoints(powerHistory);
  const consumptionW = consumptionMw * W_PER_MW;
  const [x0, x1] = xRange(series, nowTs);
  const pointsW = series.length ? series : flatLine(x0, x1, consumptionW);
  const latestW = series.length ? series[series.length - 1].y : consumptionW;

  const ysW = pointsW.map((p) => p.y);
  const axisUnit = formatPowerConsumption(Math.max(...ysW.map(Math.abs))).unit;
  const toAxis = (w: number) => formatPowerConsumption(w, axisUnit).value ?? 0;
  const fmt = (w: number) => `${toAxis(w).toFixed(2)} ${axisUnit}`;
  const latestValue = { value: toAxis(latestW).toFixed(2), unit: axisUnit };

  return {
    datasets: [
      {
        label: "Total Consumption",
        borderColor: POWER_SERIES_COLOR,
        data: pointsW.map((p) => ({ x: p.x, y: toAxis(p.y) })),
        currentValue: latestValue,
      },
    ],
    minMaxAvg: {
      min: fmt(Math.min(...ysW)),
      max: fmt(Math.max(...ysW)),
      avg: fmt(ysW.reduce((sum, y) => sum + y, 0) / ysW.length),
    },
    highlightedValue: latestValue,
    yTicksFormatter: (v: number) => `${v.toFixed(2)} ${axisUnit}`,
  };
}

export function DashboardPage({
  hashHistory,
  siteHashHistory,
  oceanHistory,
  powerHistory,
  siteMhs,
  consumptionMw,
  nominalMhs,
  nowTs,
  incidents,
  incidentsLoading,
  poolRows,
  poolsLoading,
}: {
  hashHistory: History | undefined;
  siteHashHistory: History | undefined;
  oceanHistory: History | undefined;
  powerHistory: History | undefined;
  siteMhs: number;
  consumptionMw: number;
  nominalMhs: number;
  nowTs: number;
  incidents: TIncidentRowProps[];
  incidentsLoading: boolean;
  poolRows: MiningPoolRow[];
  poolsLoading: boolean;
}) {
  return (
    <div className="site-stack-20">
      <LineChartCard
        title="Hash Rate"
        data={hashChartData(hashHistory, siteHashHistory, oceanHistory, siteMhs, nominalMhs, nowTs)}
        timelineOptions={DASHBOARD_TIMELINE_OPTIONS}
        defaultTimeline="5m"
        detailLegends
        isLoading={hashHistory === undefined}
        minHeight={280}
      />

      <Divider />

      <LineChartCard
        title="Power Consumption"
        data={powerChartData(powerHistory, consumptionMw, nowTs)}
        timelineOptions={DASHBOARD_TIMELINE_OPTIONS}
        defaultTimeline="5m"
        minHeight={280}
      />

      <div className="site-grid-360">
        <ActiveIncidentsCard label="Active Alerts" items={incidents} isLoading={incidentsLoading} emptyMessage="No active alerts" />
        <MiningPoolsPanel rows={poolRows} isLoading={poolsLoading} />
      </div>
    </div>
  );
}
