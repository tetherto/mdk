import { useQuery } from "@tetherto/mdk-react-adapter";
import { LineChartCard } from "@tetherto/mdk-react-devkit/domain";
import type { History, Sensor } from "./types";
import { get, toChartData } from "./utils";

export function SensorChart({ base, sensor, color }: { base: string; sensor: Sensor; color: string }) {
  const history = useQuery({
    queryKey: ["site-history", "temperature", sensor.deviceId],
    queryFn: () => get<History>(base, `/site/history?metric=temperature&deviceId=${encodeURIComponent(sensor.deviceId)}`),
    refetchInterval: 10000,
  });

  return (
    <LineChartCard
      title={`${sensor.label} · ${sensor.container} · ${sensor.tempC.toFixed(1)} °C`}
      data={toChartData(history.data, color, "°C")}
      isLoading={history.isLoading}
      minHeight={200}
    />
  );
}
