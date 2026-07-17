import { MiningPoolsPanel } from "@tetherto/mdk-react-devkit/domain";
import type { MiningPoolRow } from "@tetherto/mdk-react-devkit/domain";

export function PoolsPage({ poolRows }: { poolRows: MiningPoolRow[] }) {
  return <MiningPoolsPanel rows={poolRows} isLoading={poolRows.length === 0} />;
}
