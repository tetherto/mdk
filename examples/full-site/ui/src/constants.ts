export type MinerFamily = "whatsminer" | "antminer" | "avalon";

// Per-family setPowerMode support in this demo (sleep omitted — it powers the miner down).
export const MINER_POWER_MODES: Record<MinerFamily, readonly string[]> = {
  whatsminer: ["low", "normal", "high"],
  antminer: ["normal"],
  avalon: ["normal", "high"],
};

export const MHS_PER_PHS = 1e9; // MH/s per PH/s
export const HS_PER_THS = 1e12; // H/s per TH/s (pool reports hashrate in H/s)
export const HS_PER_PHS = 1e15; // H/s per PH/s (site hashrate history is in H/s)
export const W_PER_MW = 1e6; // W per MW

// Nominal (installed) hashrate per miner, used to draw the "Nominal Hash Rate"
// reference line on the dashboard. ~450 TH/s ≈ a modern air-cooled unit.
export const NOMINAL_MHS_PER_MINER = 450e6;

export const POWERMETER_CHART_COLORS = ["#4a90e2", "#7ed321", "#bd10e0", "#f5a623"];
export const SENSOR_CHART_COLORS = ["#e94e77", "#f5a623", "#50e3c2"];

// Dashboard chart palette — matches the MDK full site visual treatment.
export const HASH_SERIES_COLORS = {
  mdkFullSite: "#2fd4bf",
  aggrPool: "#8aa0b5",
  f2pool: "#a855f7",
  ocean: "#ef4444",
  nominal: "#f5c518",
} as const;

export const POWER_SERIES_COLOR = "#2fd4bf";

// Dashboard timeline range options (display-only for this example).
export const DASHBOARD_TIMELINE_OPTIONS = [
  { label: "5 Min", value: "5m" },
  { label: "30 Min", value: "30m" },
  { label: "3 H", value: "3h" },
  { label: "1 D", value: "1d" },
];
