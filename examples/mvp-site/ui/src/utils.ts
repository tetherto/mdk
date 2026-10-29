import type { LineChartCardData } from "@tetherto/mdk-react-devkit/domain";

import { auth } from "./auth";
import { MINER_POWER_MODES, type MinerFamily } from "./constants";
import type { History, Miner } from "./types";

// Sends the signed-in user's token; on a 401 it renews it once and retries.
export function get<T>(base: string, path: string): Promise<T> {
  return auth.fetcher<T>(`${base}${path}`);
}

// deviceIds are UUIDs — the worker-assigned type (miner-wm/-am/-av…) is the
// only family signal the overview carries.
export function minerFamilyFromType(type: string): MinerFamily | null {
  if (type.startsWith("miner-wm")) return "whatsminer";
  if (type.startsWith("miner-am")) return "antminer";
  if (type.startsWith("miner-av")) return "avalon";
  return null;
}

// Contract-only workers (whatsminer-/antminer-/sealminer-mdk-worker) report no device
// type, so fall back to the owning workerId, which names the brand.
export function minerFamily(miner: Pick<Miner, "type" | "workerId">): MinerFamily | null {
  const fromType = minerFamilyFromType(miner.type);
  if (fromType) return fromType;
  const workerId = miner.workerId.toLowerCase();
  if (workerId.includes("whatsminer")) return "whatsminer";
  if (workerId.includes("antminer")) return "antminer";
  if (workerId.includes("sealminer")) return "sealminer";
  if (workerId.includes("avalon")) return "avalon";
  return null;
}

export function powerModesForMiner(miner: Pick<Miner, "type" | "workerId"> | undefined): readonly string[] {
  const family = miner ? minerFamily(miner) : null;
  return family ? MINER_POWER_MODES[family] : ["normal"];
}

// Group miners into PDU columns by the prefix of info.pos ("<pdu>_<socket>").
export function groupByPdu(miners: Miner[]) {
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

export type XYPoint = { x: number; y: number };

// Collapse a history log into de-duplicated, time-sorted {x, y} points,
// dividing each raw value by `scale` (e.g. H/s → PH/s).
export function historyToPoints(history: History | undefined, scale = 1): XYPoint[] {
  const bySecond = new Map<number, XYPoint>();
  for (const p of history?.log ?? []) bySecond.set(Math.floor(p.ts / 1000), { x: p.ts, y: p.value / scale });
  return [...bySecond.values()].sort((a, b) => a.x - b.x);
}

// A flat horizontal series held at `value` across [xStart, xEnd].
export function flatLine(xStart: number, xEnd: number, value: number): XYPoint[] {
  return [
    { x: xStart, y: value },
    { x: xEnd, y: value },
  ];
}

export function toChartData(history: History | undefined, color: string, unit: string, scale = 1): LineChartCardData {
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
