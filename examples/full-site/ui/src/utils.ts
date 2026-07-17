import type { LineChartCardData } from "@tetherto/mdk-react-devkit/domain";
import { Socket } from "@tetherto/mdk-react-devkit/domain";

import { MINER_POWER_MODES, type MinerFamily } from "./constants";
import type { History, Miner } from "./types";

export function get<T>(base: string, path: string) {
  return fetch(`${base}${path}`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });
}

export function minerFamilyFromDeviceId(deviceId: string): MinerFamily | null {
  const prefix = deviceId.split("-")[0];
  if (prefix === "whatsminer" || prefix === "antminer" || prefix === "avalon") return prefix;
  return null;
}

export function powerModesForDevice(deviceId: string): readonly string[] {
  const family = minerFamilyFromDeviceId(deviceId);
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

type SocketMiner = Parameters<typeof Socket>[0]["miner"];

// Shape a miner into the structure <Socket> reads (snap.stats / snap.config).
export function toSocketMiner(m: Miner): SocketMiner {
  const snap = {
    stats: { status: m.status, hashrate_mhs: { t_5m: m.hashrateMhs } },
    config: { power_mode: m.powerMode ?? "normal" },
  };
  return { snap, last: { snap }, temperature: { chip: m.temperature } } as unknown as SocketMiner;
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
