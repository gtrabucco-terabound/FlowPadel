import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/(auth)/actions";
import { MobileMenu } from "@/components/site-header-mobile";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Notificaciones sin leer (RLS ya restringe a las del jugador logueado).
  let unread = 0;
  // ¿Es admin/staff de algún club o superadmin? → mostrar acceso al Panel.
  let isAdmin = false;
  let displayName = "";
  if (user) {
    const [{ count }, { data: membership }, { data: profile }, { data: player }] =
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
        supabase
          .from("players")
          .select("first_name, full_name")
          .eq("profile_id", user.id)
          .maybeSingle(),
      ]);
    unread = count ?? 0;
    isAdmin = !!membership || profile?.global_role === "superadmin";
    displayName =
      player?.first_name?.trim() ||
      player?.full_name?.trim().split(" ")[0] ||
      user.email?.split("@")[0] ||
      "";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="FlowPadel inicio">
          <Logo />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* --- Barra completa: solo desktop --- */}
          <Link
            href="/torneos"
            className="hidden px-1 text-sm font-medium text-ink transition-colors hover:text-padel-600 sm:inline"
          >
            Torneos
          </Link>
          <Link
            href="/reservar"
            className="hidden px-1 text-sm font-medium text-ink transition-colors hover:text-padel-600 sm:inline"
          >
            Reservar
          </Link>
          <Link
            href="/ranking"
            className="hidden px-1 text-sm font-medium text-ink transition-colors hover:text-padel-600 sm:inline"
          >
            Ranking
          </Link>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Campana: en móvil y desktop */}
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
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/admin" className="hidden sm:inline">
              <Button size="sm" variant="outline">
                Panel
              </Button>
            </a>
          )}

          {user ? (
            <>
              <Link href="/perfil" className="hidden sm:inline">
                <Button size="sm">
                  {displayName ? `Hola, ${displayName}` : "Mi perfil"}
                </Button>
              </Link>
              <form action={logoutAction} className="hidden sm:block">
                <Button type="submit" variant="ghost" size="sm">
                  Salir
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hidden sm:inline">
              <Button size="sm">Ingresar</Button>
            </Link>
          )}

          {/* --- Menú hamburguesa: solo móvil --- */}
          <MobileMenu user={!!user} isAdmin={isAdmin} name={displayName} />
        </div>
      </div>
    </header>
  );
}
