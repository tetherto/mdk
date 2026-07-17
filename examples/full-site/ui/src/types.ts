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
