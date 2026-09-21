import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  FileText,
  Kanban,
  LayoutDashboard,
  Lock,
  Package,
  Receipt,
  Settings,
  Shield,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Operate",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/quotes", label: "Quotes", icon: Kanban },
      { href: "/admin/contacts", label: "Contacts", icon: Users },
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/customers", label: "Customers", icon: UserRound },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/catalog", label: "Products", icon: Package },
      { href: "/admin/content", label: "Content", icon: FileText },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/tracking", label: "Tracking", icon: Activity },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "Staff", icon: Shield },
      { href: "/admin/security", label: "Security", icon: Lock },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
];

export function isAdminNavActive(href: string, location: string): boolean {
  if (href === "/admin") return location === "/admin";
  if (href === "/admin/quotes") {
    return location === "/admin/quotes" || location.startsWith("/admin/deals/");
  }
  return location === href || location.startsWith(`${href}/`);
}
