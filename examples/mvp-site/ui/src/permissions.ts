import type { Access } from "./types";

// Pages that depend on a permission; every other page is open to any signed-in user.
export type Pages = { control: boolean; activity: boolean };

// What the UI offers the signed-in user, from GET /site/access. It only shapes
// the UI: the Gateway checks every route call and the Kernel every device call.
export type Permissions = {
  pages: Pages;
  canSetPowerMode: boolean;
  canSetPools: boolean;
  // Miners each action may target.
  powerModeMiners: ReadonlySet<string>;
  poolMiners: ReadonlySet<string>;
};

export function permissionsFrom(access: Access | undefined): Permissions {
  const routes = access?.routes ?? {};
  const canSetPowerMode = !!routes["site.miner-command"];
  const canSetPools = !!routes["site.miner-pools"];
  return {
    pages: { control: canSetPowerMode || canSetPools, activity: !!routes["site.activity"] },
    canSetPowerMode,
    canSetPools,
    powerModeMiners: new Set(access?.miners.command ?? []),
    poolMiners: new Set(access?.miners.pools ?? []),
  };
}
