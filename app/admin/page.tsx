import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventStatusMeta, formatDate } from "@/lib/format";
import type { Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  const clubId = ctx.activeClubId;
  const supabase = await createClient();

  const [{ data: events }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, slug, status, start_date, event_type")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
  ]);

  const rows = (events ?? []) as Pick<
    Tables<"events">,
    "id" | "name" | "slug" | "status" | "start_date" | "event_type"
  >[];

  const total = rows.length;
  const inProgress = rows.filter((e) => e.status === "in_progress").length;
  const pending = pendingCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-muted">{ctx.activeMembership.club.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Eventos totales" value={total} />
        <Metric label="En progreso" value={inProgress} />
        <Metric label="Inscripciones pendientes" value={pending} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Eventos recientes</h2>
          <Link
            href="/admin/events"
            className="text-sm font-semibold text-padel-600 hover:text-padel-700"
          >
            Ver todos
          </Link>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted">
              Todavía no creaste eventos.{" "}
              <Link
                href="/admin/events"
                className="font-semibold text-padel-600"
              >
                Crear el primero
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 6).map((e) => {
              const meta = eventStatusMeta(e.status);
              return (
                <Link key={e.id} href={`/admin/events/${e.id}`}>
                  <Card className="transition-colors hover:border-padel-200">
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">
                          {e.name}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDate(e.start_date)}
                        </p>
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-3xl font-semibold text-padel-600">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </CardContent>
    </Card>
  );
}
