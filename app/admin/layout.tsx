import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { ClubSwitcher } from "@/components/admin/club-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();
  const roleLabel =
    ctx.activeMembership.role === "club_admin" ? "Administrador" : "Staff";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-border-soft bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-semibold text-padel-600">
              FlowPadel
            </Link>
            <span className="hidden text-black/10 sm:inline">/</span>
            <div className="hidden sm:block">
              <ClubSwitcher
                memberships={ctx.memberships}
                activeClubId={ctx.activeClubId}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-muted sm:inline">
              {roleLabel}
            </span>
            <ThemeToggle />
            <Link href="/" className="hidden sm:inline">
              <Button variant="ghost" size="sm">
                App pública
              </Button>
            </Link>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-20">
            <div className="mb-3 sm:hidden">
              <ClubSwitcher
                memberships={ctx.memberships}
                activeClubId={ctx.activeClubId}
              />
            </div>
            <SidebarNav role={ctx.activeMembership.role} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
