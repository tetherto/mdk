export type Miner = {
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

export type OceanAccount = {
  username: string;
  timestamp: number;
  hashrate: number;
  hashrate1h: number;
  hashrate24h: number;
  hashrateStale1h: number;
  hashrateStale24h: number;
  balanceBtc: number;
  unsettledBtc: number;
  revenue24hBtc: number;
  estimatedTodayIncomeSats: number;
  workerCount: number;
  activeWorkersCount: number;
};

export type OceanWorker = {
  id: string;
  name: string;
  username: string;
  online: boolean;
  lastUpdated: number;
  hashrate: number;
  hashrate1h: number;
  hashrate24h: number;
};

export type OceanAlert = {
  uuid: string;
  name: string;
  description: string;
  severity: string;
  createdAt: number;
};

export type DatumClientStats = {
  acceptedShares: number;
  acceptedSharesDiff: number;
  rejectedShares: number;
  rejectedSharesDiff: number;
  ready: boolean;
  poolHost: string;
  poolTag: string;
  minerTag: string;
  poolMinDiff: number;
  poolPubKey: string;
  uptimeS: number;
};

export type DatumStratumInfo = {
  activeThreads: number;
  totalConnections: number;
  totalWorkSubscriptions: number;
  estimatedHashrateThs: number;
};

export type DatumJob =
  | { error: string }
  | {
      error?: undefined;
      blockHeight: number;
      blockValueBtc: number;
      previousBlock: string;
      blockDifficulty: number;
      bits: string;
      versionHex: string;
      timeCurrent: number;
      sizeBytes: number;
      weight: number;
      sigops: number;
      txCount: number;
    };

export type DatumThread = {
  id: string;
  connectionCount: number;
  subscriptionCount: number;
  approxHashrateThs: number;
};

export type DatumClient = {
  id: string;
  threadId: string;
  remoteHost: string;
  authUsername: string;
  subscribed: boolean;
  sid: string;
  sidTimeS: number;
  lastShareS: number;
  vdiff: number;
  acceptedDiff: number;
  acceptedCount: number;
  rejectedDiff: number;
  rejectedCount: number;
  rejectedPct: number;
  hashrateThs: number | null;
  hashrateAgeS: number;
  coinbase: string;
  useragent: string;
};

export type DatumCoinbaserOutput = { address: string; valueSats: number; valueBtc: number };

export type DatumGateway = {
  status: string | null;
  error: string | null;
  connections: number;
  hashrateThs: number;
  clientStats: DatumClientStats | null;
  stratumInfo: DatumStratumInfo | null;
  job: DatumJob | null;
  threads: DatumThread[];
  clients: DatumClient[];
  coinbaser: DatumCoinbaserOutput[];
};

export type OceanPool = {
  deviceId: string;
  workerId: string;
  poolType: string;
  ts: number;
  accounts: OceanAccount[];
  workers: OceanWorker[];
  workersTs: number;
  alerts: OceanAlert[];
  gatewayAvailable: boolean;
  gateway: DatumGateway;
};

export type OceanOverview = { ts: number; pools: OceanPool[] };
