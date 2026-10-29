// setupPools param shape (whatsminer takes up to 3).
export type PoolInput = {
  url: string;
  worker_name: string;
  worker_password: string;
};

export type Miner = {
  deviceId: string;
  code: string;
  type: string;
  workerId: string;
  container: string;
  pos: string;
  status: string;
  powerMode: string | null;
  hashrateMhs: number;
  powerW: number;
  temperature: number;
};

export type Container = {
  deviceId: string;
  id: string;
  code: string;
  operatingStatus: string;
  powerW: number;
  ambientTempC: number;
  inletTempC: number;
  minerCount: number;
};

export type Powermeter = {
  deviceId: string;
  code: string;
  type: string;
  label: string;
  powerW: number;
  tensionV: number;
  currentA: number;
};

export type Sensor = {
  deviceId: string;
  container: string;
  label: string;
  tempC: number;
  status: string;
};

export type Pool = {
  deviceId: string;
  name: string;
  poolType: string;
  status: string;
  hashrate: number;
  hashrate24h: number;
  workersOnline: number;
  balanceBtc: number;
  revenue24hBtc: number;
};

export type Overview = {
  ts: number;
  containers: Container[];
  site: { powerW: number; tensionV: number; currentA: number };
  powermeters: Powermeter[];
  pools: Pool[];
  sensors: Sensor[];
  miners: Miner[];
  totals: { hashrateMhs: number; powerW: number; minerCount: number; onlineCount: number };
};

export type HistoryPoint = { ts: number; value: number };
export type History = { metric: string; unit: string; deviceId?: string; log: HistoryPoint[] };

// GET /site/access — what the signed-in user may do (the Gateway and Kernel enforce it).
export type Access = {
  user: { kind: string; sub: string; email?: string; groups: string[] };
  roles: string[];
  routes: Record<string, boolean>;
  miners: { command: string[]; pools: string[] };
};

// GET /site/activity — one command attempt from the Kernel's write-command log.
export type ActivityEntry = {
  ts: number;
  commandId: string | null;
  user: string | null;
  roles: string[];
  via: string | null;
  command: string | null;
  deviceId: string | null;
  params: Record<string, unknown>;
  outcome: string | null;
  error: string | null;
};
