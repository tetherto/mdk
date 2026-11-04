import { Navigate, useNavigate, useParams } from "react-router";

import { SingleStatCard } from "@tetherto/mdk-react-devkit/domain";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Typography,
} from "@tetherto/mdk-react-devkit/primitives";

import { ContainerGrid } from "./ContainerGrid";
import type { Container, Miner } from "./types";
import { isMinerOnline } from "./utils";

export function ContainersListPage({
  allContainers,
  minersByContainer,
}: {
  allContainers: Container[];
  minersByContainer: Map<string, Miner[]>;
}) {
  const navigate = useNavigate();

  return (
    <div className="site-containers">
      <Typography variant="heading3">Containers</Typography>
      <div className="site-containers__grid">
        {allContainers.map((c) => {
          const miners = minersByContainer.get(c.id) ?? [];
          // A Worker reports `mining` or `sleeping`, never `online`, so the
          // previous comparison against that string counted zero on every card
          // however many miners were up. isMinerOnline holds the real set.
          const onlineCount = miners.filter(isMinerOnline).length;
          const isOnline = c.operatingStatus === "online";
          return (
            <Card
              key={c.deviceId}
              onClick={() => navigate(`/containers/${encodeURIComponent(c.id)}`)}
              className="site-containers__card"
            >
              <CardHeader className="site-containers__card-header">
                <Typography variant="heading3" className="site-containers__card-title">{c.id}</Typography>
                {/* The badge is the fixed part of this row: without flexShrink
                    a long container id squeezed it until its text met the card
                    edge and clipped. */}
                <span className="site-containers__card-status">
                  <Badge status={isOnline ? "success" : "error"} text={c.operatingStatus} />
                </span>
              </CardHeader>
              <CardBody className="site-containers__card-body">
                {/* MetricCard is the devkit's own figure-with-label, so these
                    read the same as every other number in the app. Hand-rolled
                    Typography pairs also wrapped "online" away from its count. */}
                <div className="site-containers__metrics">
                  <SingleStatCard variant="compact" name="Miners online" value={`${onlineCount} / ${miners.length}`} />
                  <SingleStatCard variant="compact" name="Power" value={(c.powerW / 1000).toFixed(1)} unit="kW" />
                  <SingleStatCard variant="compact" name="Inlet temp" value={c.inletTempC.toFixed(1)} unit="°C" />
                  <SingleStatCard variant="compact" name="Ambient temp" value={c.ambientTempC.toFixed(1)} unit="°C" />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function ContainerDetailPage({
  allContainers,
  minersByContainer,
}: {
  allContainers: Container[];
  minersByContainer: Map<string, Miner[]>;
}) {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const container = allContainers.find((c) => c.id === decodeURIComponent(containerId ?? "")) ?? null;

  if (!container) return <Navigate to="/containers" replace />;

  return (
    <div className="site-container-detail">
      <div>
        <Button variant="secondary" onClick={() => navigate("/containers")}>← Containers</Button>
      </div>
      <ContainerGrid container={container} miners={minersByContainer.get(container.id) ?? []} />
    </div>
  );
}
