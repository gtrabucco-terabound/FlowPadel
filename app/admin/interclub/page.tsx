import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listLigas } from "@/modules/interclub/repository";
import { NewLigaForm } from "@/components/admin/interclub-manager";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "draft" | "open" | "live" | "neutral" }> = {
  draft: { label: "Borrador", tone: "draft" },
  open: { label: "Abierta", tone: "open" },
  in_progress: { label: "En juego", tone: "live" },
  closed: { label: "Cerrada", tone: "neutral" },
};

export default async function InterclubPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();
  const ligas = await listLigas(supabase, ctx.activeClubId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Interclub</h1>
        <p className="text-sm text-muted">
          Ligas por equipos/clubes: todos contra todos en series, y ranking de clubes.
        </p>
      </div>

      <Card>
        <CardContent className="py-5">
          <NewLigaForm />
        </CardContent>
      </Card>

      {ligas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            Todavía no creaste ninguna liga interclub.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ligas.map((l) => {
            const st = STATUS[l.status] ?? STATUS.draft;
            return (
              <Link key={l.id} href={`/admin/interclub/${l.id}`}>
                <Card className="transition-colors hover:border-accent">
                  <CardContent className="flex items-center justify-between gap-2 py-4">
                    <span className="font-semibold text-ink">{l.name}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
