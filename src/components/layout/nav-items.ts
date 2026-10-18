import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Tags,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchExact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchExact: true,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Categories",
    href: "/categories",
    icon: Tags,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
