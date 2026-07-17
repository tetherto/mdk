import { Typography } from "@tetherto/mdk-react-devkit/primitives";

import { POWERMETER_CHART_COLORS, SENSOR_CHART_COLORS } from "./constants";
import { PowermeterChart } from "./PowermeterChart";
import { SensorChart } from "./SensorChart";
import type { Powermeter, Sensor } from "./types";

export function MonitoringPage({
  base,
  powermeters,
  sensors,
}: {
  base: string;
  powermeters: Powermeter[];
  sensors: Sensor[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {powermeters.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Typography variant="heading3">Power meters</Typography>
          <div
            data-testid="powermeter-charts"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}
          >
            {powermeters.map((meter, i) => (
              <PowermeterChart
                key={meter.deviceId}
                base={base}
                meter={meter}
                color={POWERMETER_CHART_COLORS[i % POWERMETER_CHART_COLORS.length]}
              />
            ))}
          </div>
        </section>
      )}

      {sensors.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Typography variant="heading3">Temperature sensors</Typography>
          <div
            data-testid="sensor-charts"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}
          >
            {sensors.map((sensor, i) => (
              <SensorChart
                key={sensor.deviceId}
                base={base}
                sensor={sensor}
                color={SENSOR_CHART_COLORS[i % SENSOR_CHART_COLORS.length]}
              />
            ))}
          </div>
        </section>
      )}

      {powermeters.length === 0 && sensors.length === 0 && (
        <Typography variant="caption">No power meters or sensors available.</Typography>
      )}
    </div>
  );
}
