"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Enums } from "@/lib/database.types";

type NavItem = {
  href: string;
  label: string;
  exact: boolean;
  adminOnly?: boolean;
  superadminOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/clubes", label: "Clubes", exact: false, superadminOnly: true },
  { href: "/admin/events", label: "Eventos", exact: false },
  { href: "/admin/calendario", label: "Calendario", exact: false },
  { href: "/admin/players", label: "Jugadores", exact: false },
  { href: "/admin/miembros", label: "Miembros", exact: false, adminOnly: true },
  { href: "/admin/proyeccion", label: "Proyección", exact: false },
  { href: "/admin/prospectos", label: "Prospectos", exact: false, adminOnly: true },
  { href: "/admin/settings", label: "Ajustes", exact: false },
];

export function SidebarNav({
  role,
  superadmin,
}: {
  role?: Enums<"club_member_role">;
  superadmin?: boolean;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter(
    (item) =>
      (!item.adminOnly || role === "club_admin") &&
      (!item.superadminOnly || superadmin)
  );

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
