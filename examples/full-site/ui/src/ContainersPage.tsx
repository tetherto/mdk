import { Navigate, useNavigate, useParams } from "react-router-dom";

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

export function ContainersListPage({
  allContainers,
  minersByContainer,
}: {
  allContainers: Container[];
  minersByContainer: Map<string, Miner[]>;
}) {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Typography variant="heading3">Containers</Typography>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {allContainers.map((c) => {
          const miners = minersByContainer.get(c.id) ?? [];
          const onlineCount = miners.filter((m) => m.status === "online").length;
          const isOnline = c.operatingStatus === "online";
          return (
            <Card
              key={c.deviceId}
              onClick={() => navigate(`/containers/${encodeURIComponent(c.id)}`)}
              style={{ cursor: "pointer" }}
            >
              <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "20px" }}>
                <Typography variant="heading3" style={{ minWidth: 0, wordBreak: "break-word" }}>{c.id}</Typography>
                <Badge status={isOnline ? "success" : "error"} text={c.operatingStatus} />
              </CardHeader>
              <CardBody style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Typography variant="caption" style={{ color: "#555", display: "block" }}>Miners</Typography>
                    <Typography variant="body">{onlineCount} / {miners.length} online</Typography>
                  </div>
                  <div>
                    <Typography variant="caption" style={{ color: "#555", display: "block" }}>Power</Typography>
                    <Typography variant="body">{(c.powerW / 1000).toFixed(1)} kW</Typography>
                  </div>
                  <div>
                    <Typography variant="caption" style={{ color: "#555", display: "block" }}>Inlet temp</Typography>
                    <Typography variant="body">{c.inletTempC.toFixed(1)}°C</Typography>
                  </div>
                  <div>
                    <Typography variant="caption" style={{ color: "#555", display: "block" }}>Ambient temp</Typography>
                    <Typography variant="body">{c.ambientTempC.toFixed(1)}°C</Typography>
                  </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button variant="secondary" onClick={() => navigate("/containers")}>← Containers</Button>
        <Typography variant="heading3">{container.id}</Typography>
      </div>
      <ContainerGrid container={container} miners={minersByContainer.get(container.id) ?? []} />
    </div>
  );
}
