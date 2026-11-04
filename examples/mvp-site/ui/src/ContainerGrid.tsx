import { useMemo } from "react";

import { getHashrateString, MetricCard, SingleStatCard } from "@tetherto/mdk-react-devkit/domain";
import { Badge, EmptyState, LabeledCard, Typography } from "@tetherto/mdk-react-devkit/primitives";

import type { Container, Miner } from "./types";
import { groupByPdu, isMinerOnline, NO_PDU } from "./utils";

export function ContainerGrid({ container, miners }: { container: Container; miners: Miner[] }) {
  const pduGroups = useMemo(() => groupByPdu(miners), [miners]);
  const onlineCount = miners.filter(isMinerOnline).length;
  const isOnline = container.operatingStatus === "online";

  return (
    <section className="site-container">
      <div className="site-container__head">
        <Typography variant="heading3">{container.id}</Typography>
        <Badge status={isOnline ? "success" : "error"} text={container.operatingStatus} />
      </div>

      {/* The summary was one run-on Typography line that wrapped mid-phrase.
          MetricCard is what the rest of the app shows a figure with. */}
      <div className="site-container__summary" data-testid={`container-summary-${container.id}`}>
        <MetricCard label="Miners online" value={`${onlineCount} / ${miners.length}`} unit="" />
        <MetricCard label="Power" value={(container.powerW / 1000).toFixed(1)} unit="kW" />
        <MetricCard label="Inlet temp" value={container.inletTempC.toFixed(1)} unit="°C" />
        <MetricCard label="Ambient temp" value={container.ambientTempC.toFixed(1)} unit="°C" />
      </div>

      {miners.length === 0 ? (
        <EmptyState description="No miners linked to this container." size="sm" />
      ) : (
        <div className="site-container__groups" data-testid={`container-grid-${container.id}`}>
          {Object.entries(pduGroups).map(([pdu, pduMiners]) => (
            <div className="site-container__group" key={pdu}>
              {pdu === NO_PDU ? null : <Typography variant="caption">PDU {pdu}</Typography>}
              <div className="site-container__miners">
                {pduMiners.map((m) => (
                  <div key={m.deviceId} data-testid={`miner-tile-${m.deviceId}`}>
                    <LabeledCard
                      isFullHeight
                      label={
                        <span className="site-container__miner-label">
                          {m.code} · #{m.pos.split("_").pop()}
                          <Badge status={isMinerOnline(m) ? "success" : "error"} text={m.status} />
                        </span>
                      }
                    >
                      <div className="site-container__miner-metrics">
                        <SingleStatCard variant="compact" name="Hash rate" value={getHashrateString(m.hashrateMhs)} />
                        <SingleStatCard variant="compact" name="Power" value={m.powerW.toFixed(0)} unit="W" />
                        <SingleStatCard variant="compact" name="Temp" value={m.temperature.toFixed(0)} unit="°C" />
                      </div>
                    </LabeledCard>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
