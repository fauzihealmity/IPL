"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Home,
  Users,
  Wallet,
  FileText,
  CreditCard,
  AlertTriangle,
  PiggyBank,
  MessageSquareWarning,
  Megaphone,
  BarChart3,
  Bell,
  ScrollText,
  Settings,
  Receipt,
  UserRound,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// NOTE: nav items (including icon components, which are functions) must
// live inside this "use client" module. Server Components (the admin/
// resident layouts) cannot pass functions as props to a Client
// Component across the RSC boundary — only plain serializable data.
const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/houses", label: "Data Rumah", icon: Home },
  { href: "/admin/residents", label: "Data Warga", icon: Users },
  { href: "/admin/ipl-rates", label: "Tarif IPL", icon: Wallet },
  { href: "/admin/invoices", label: "Tagihan", icon: FileText },
  { href: "/admin/payments", label: "Pembayaran", icon: CreditCard },
  { href: "/admin/arrears", label: "Tunggakan", icon: AlertTriangle },
  { href: "/admin/finance", label: "Keuangan", icon: PiggyBank },
  { href: "/admin/complaints", label: "Pengaduan", icon: MessageSquareWarning },
  { href: "/admin/announcements", label: "Pengumuman", icon: Megaphone },
  { href: "/admin/reports", label: "Laporan", icon: BarChart3 },
  { href: "/admin/notifications", label: "Notifikasi", icon: Bell },
  { href: "/admin/audit-logs", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

const RESIDENT_NAV_ITEMS: NavItem[] = [
  { href: "/resident/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resident/invoices", label: "Tagihan", icon: FileText },
  { href: "/resident/payments", label: "Pembayaran", icon: CreditCard },
  { href: "/resident/receipts", label: "Kwitansi", icon: Receipt },
  { href: "/resident/complaints", label: "Pengaduan", icon: MessageSquareWarning },
  { href: "/resident/announcements", label: "Pengumuman", icon: Megaphone },
  { href: "/resident/transparency", label: "Transparansi", icon: PiggyBank },
  { href: "/resident/profile", label: "Profil", icon: UserRound },
];

function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebarNav() {
  return <NavList items={ADMIN_NAV_ITEMS} />;
}

export function ResidentSidebarNav() {
  return <NavList items={RESIDENT_NAV_ITEMS} />;
}

// Exposed so the mobile bottom-nav (also client-side) can reuse the
// same source of truth without re-declaring icons elsewhere.
export function ResidentBottomNav() {
  const pathname = usePathname();
  const items = RESIDENT_NAV_ITEMS.slice(0, 4);

  return (
    <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t bg-background py-2 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 text-xs",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
