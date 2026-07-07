import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/(auth)/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Notificaciones sin leer (RLS ya restringe a las del jugador logueado).
  let unread = 0;
  // ¿Es admin/staff de algún club o superadmin? → mostrar acceso al Panel.
  let isAdmin = false;
  if (user) {
    const [{ count }, { data: membership }, { data: profile }] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null),
        supabase
          .from("club_members")
          .select("id")
          .eq("profile_id", user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("global_role")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
    unread = count ?? 0;
    isAdmin = !!membership || profile?.global_role === "superadmin";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="FlowPadel inicio">
          <Logo />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Selector de club (placeholder — multi-club en fase siguiente) */}
          <button
            type="button"
            disabled
            className="hidden items-center gap-1 rounded-xl border border-border-soft px-3 py-1.5 text-sm font-medium text-muted sm:inline-flex"
            title="Selección de club (próximamente)"
          >
            Todos los clubes
          </button>

          <Link
            href="/torneos"
            className="px-1 text-sm font-medium text-ink transition-colors hover:text-padel-600"
          >
            Torneos
          </Link>

          <Link
            href="/ranking"
            className="px-1 text-sm font-medium text-ink transition-colors hover:text-padel-600"
          >
            Ranking
          </Link>

          <ThemeToggle />

          {user && (
            <Link
              href="/notificaciones"
              aria-label="Notificaciones"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-soft text-ink transition-colors hover:bg-surface-2"
            >
              <span aria-hidden className="text-base">🔔</span>
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin" className="hidden sm:inline">
              <Button size="sm" variant="outline">
                Panel
              </Button>
            </Link>
          )}

          {user ? (
            <>
              <Link href="/perfil">
                <Button size="sm">Mi perfil</Button>
              </Link>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Salir
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Ingresar</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
