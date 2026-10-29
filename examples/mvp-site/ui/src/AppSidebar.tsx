import { useLocation, useNavigate } from "react-router";

import {
  ContainerWidgetsNavIcon,
  DashboardNavIcon,
  MinersOverviewNavIcon,
  OperationsNavIcon,
  PoolsIcon,
  PowerIcon,
  ReportingNavIcon,
  Sidebar,
  type SidebarMenuItem,
} from "@tetherto/mdk-react-devkit/primitives";

import type { Pages } from "./permissions";

const NAV_ITEMS: SidebarMenuItem[] = [
  { id: "/dashboard", label: "Dashboard", icon: <DashboardNavIcon /> },
  { id: "/containers", label: "Containers", icon: <ContainerWidgetsNavIcon /> },
  { id: "/miners", label: "Miners", icon: <MinersOverviewNavIcon /> },
  { id: "/monitoring", label: "Power & Sensors", icon: <OperationsNavIcon /> },
  { id: "/pools", label: "Pools", icon: <PoolsIcon /> },
  { id: "/control", label: "Control", icon: <PowerIcon /> },
  { id: "/activity", label: "Activity", icon: <ReportingNavIcon /> },
];

// Pages the signed-in user has no use for are left out of the menu.
export function AppSidebar({ pages }: { pages: Pages }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = "/" + location.pathname.split("/")[1];
  const items = NAV_ITEMS.filter((item) => pages[item.id.slice(1) as keyof Pages] !== false);

  return (
    <Sidebar
      items={items}
      activeId={activeId}
      onItemClick={({ id }) => navigate(id)}
      defaultExpanded={true}
    />
  );
}
