import { useLocation, useNavigate } from "react-router";

import {
  ContainerWidgetsNavIcon,
  DashboardNavIcon,
  DatumOceanIcon,
  OperationsNavIcon,
  PoolsIcon,
  PowerIcon,
  Sidebar,
  type SidebarMenuItem,
} from "@tetherto/mdk-react-devkit/primitives";

const NAV_ITEMS: SidebarMenuItem[] = [
  { id: "/dashboard", label: "Dashboard", icon: <DashboardNavIcon /> },
  { id: "/containers", label: "Containers", icon: <ContainerWidgetsNavIcon /> },
  { id: "/monitoring", label: "Power & Sensors", icon: <OperationsNavIcon /> },
  { id: "/pools", label: "Pools", icon: <PoolsIcon /> },
  { id: "/ocean", label: "Ocean & DATUM", icon: <DatumOceanIcon /> },
  { id: "/control", label: "Control", icon: <PowerIcon /> },
];

export function AppSidebar({ showOcean }: { showOcean: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = "/" + location.pathname.split("/")[1];
  const items = showOcean ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.id !== "/ocean");

  return (
    <Sidebar
      items={items}
      activeId={activeId}
      onItemClick={({ id }) => navigate(id)}
      defaultExpanded={true}
    />
  );
}
