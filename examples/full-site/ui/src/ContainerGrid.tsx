import { useMemo } from "react";

import { Socket } from "@tetherto/mdk-react-devkit/domain";
import { Typography } from "@tetherto/mdk-react-devkit/primitives";

import type { Container, Miner } from "./types";
import { groupByPdu, toSocketMiner } from "./utils";

export function ContainerGrid({ container, miners }: { container: Container; miners: Miner[] }) {
  const pduGroups = useMemo(() => groupByPdu(miners), [miners]);
  return (
    <section style={{ background: "#141414", borderRadius: 12, padding: 16 }}>
      <Typography variant="heading3">
        {container.id} · {container.operatingStatus} · {miners.length} miners · {container.powerW.toFixed(0)} W
        {" · "}
        <span data-testid={`container-temp-${container.id}`}>
          inlet {container.inletTempC.toFixed(1)}°C · ambient {container.ambientTempC.toFixed(1)}°C
        </span>
      </Typography>
      {miners.length === 0 ? (
        <Typography variant="caption" style={{ marginTop: 12, display: "block" }}>No miners linked to this container.</Typography>
      ) : (
        <div data-testid={`container-grid-${container.id}`} style={{ display: "flex", gap: 16, marginTop: 12, overflowX: "auto" }}>
          {Object.entries(pduGroups).map(([pdu, pduMiners]) => (
            <div key={pdu} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Typography variant="caption">PDU {pdu}</Typography>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {pduMiners.map((m) => (
                  <Socket
                    key={m.deviceId}
                    socket={Number(m.pos.split("_").pop())}
                    enabled
                    power_w={m.powerW}
                    miner={toSocketMiner(m)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
