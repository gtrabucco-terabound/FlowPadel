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

type NavGroup = {
  /** Título de la sección. null = ítems sueltos arriba de todo. */
  title: string | null;
  items: NavItem[];
};

// Menú agrupado por área para que sea fácil de escanear (nombres visibles al
// cliente, nunca los internos Flow OP/COS/MKT/BOS).
const GROUPS: NavGroup[] = [
  {
    title: null,
    items: [{ href: "/admin", label: "Inicio", exact: true }],
  },
  {
    title: "Operación",
    items: [
      { href: "/admin/agenda", label: "Agenda", exact: false },
      { href: "/admin/turnos-fijos", label: "Turnos fijos", exact: false },
      { href: "/admin/calendario", label: "Calendario", exact: false },
      { href: "/admin/events", label: "Torneos", exact: false },
    ],
  },
  {
    title: "Comunidad",
    items: [
      { href: "/admin/players", label: "Jugadores", exact: false },
      { href: "/admin/prospectos", label: "Prospectos", exact: false, adminOnly: true },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/admin/miembros", label: "Miembros", exact: false, adminOnly: true },
      { href: "/admin/operar", label: "Operar clubes", exact: false },
      { href: "/admin/proyeccion", label: "Proyección económica", exact: false, adminOnly: true },
      { href: "/admin/settings", label: "Configuración", exact: false },
    ],
  },
  {
    title: "Plataforma",
    items: [
      { href: "/admin/clubes", label: "Clubes", exact: false, superadminOnly: true },
    ],
  },
];

export function SidebarNav({
  role,
  superadmin,
}: {
  role?: Enums<"club_member_role">;
  superadmin?: boolean;
}) {
  const pathname = usePathname();

  const canSee = (item: NavItem) =>
    (!item.adminOnly || role === "club_admin") &&
    (!item.superadminOnly || superadmin);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav className="space-y-5">
      {GROUPS.map((group, gi) => {
        const items = group.items.filter(canSee);
        if (items.length === 0) return null;
        return (
          <div key={group.title ?? `g${gi}`} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {group.title}
              </p>
            )}
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item)
                    ? "bg-accent text-accent-ink"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
