import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

          {user ? (
            <Link href="/perfil">
              <Button size="sm">Mi perfil</Button>
            </Link>
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
