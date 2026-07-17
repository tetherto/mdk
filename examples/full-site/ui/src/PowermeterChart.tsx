import { useQuery } from "@tetherto/mdk-react-adapter";
import { LineChartCard } from "@tetherto/mdk-react-devkit/domain";
import type { History, Powermeter } from "./types";
import { get, toChartData } from "./utils";

export function PowermeterChart({ base, meter, color }: { base: string; meter: Powermeter; color: string }) {
  const history = useQuery({
    queryKey: ["site-history", "power", meter.deviceId],
    queryFn: () => get<History>(base, `/site/history?metric=power&deviceId=${encodeURIComponent(meter.deviceId)}`),
    refetchInterval: 10000,
  });

  return (
    <LineChartCard
      title={`${meter.label} · ${meter.powerW.toFixed(0)} W`}
      data={toChartData(history.data, color, "W")}
      isLoading={history.isLoading}
      minHeight={200}
    />
  );
}
