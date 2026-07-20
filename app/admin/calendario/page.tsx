import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventStatusMeta, formatDateRange } from "@/lib/format";
import {
  listClubCalendarEvents,
  type CalendarEvent as Ev,
} from "@/modules/tournaments/repository";

export const dynamic = "force-dynamic";

/** ¿Se solapan los rangos de fecha de dos eventos? (día suelto = start=end) */
function overlap(a: Ev, b: Ev): boolean {
  if (!a.start_date || !b.start_date) return false;
  const aStart = a.start_date;
  const aEnd = a.end_date ?? a.start_date;
  const bStart = b.start_date;
  const bEnd = b.end_date ?? b.start_date;
  return aStart <= bEnd && bStart <= aEnd;
}

export default async function CalendarioPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const events = await listClubCalendarEvents(supabase, ctx.activeClubId);
  const dated = events.filter((e) => e.start_date);
  const undated = events.filter((e) => !e.start_date);

  // Marca qué eventos se solapan con otro (choque de fechas).
  const clash = new Set<string>();
  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      if (overlap(dated[i], dated[j])) {
        clash.add(dated[i].id);
        clash.add(dated[j].id);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Calendario</h1>
        <p className="mt-1 text-sm text-muted">
          Todos los torneos del club por fecha. Se avisa si dos se pisan.
        </p>
      </div>

      {dated.length === 0 && undated.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted">
            Todavía no hay torneos. Cuando crees uno con fecha, aparece acá.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {dated.map((e) => {
            const st = eventStatusMeta(e.status);
            const hasClash = clash.has(e.id);
            return (
              <div
                key={e.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
                  hasClash
                    ? "border-amber-400/50 bg-amber-400/10"
                    : "border-border-soft bg-surface"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{e.name}</p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {hasClash && <Badge tone="live">⚠️ Choque de fecha</Badge>}
                  </div>
                  <p className="text-xs text-muted">
                    {formatDateRange(e.start_date, e.end_date)}
                    {e.venue ? ` · 📍 ${e.venue}` : ""}
                  </p>
                </div>
              </div>
            );
          })}

          {undated.length > 0 && (
            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Sin fecha definida
              </p>
              <div className="space-y-2">
                {undated.map((e) => {
                  const st = eventStatusMeta(e.status);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-2 rounded-xl border border-border-soft bg-surface px-4 py-3"
                    >
                      <p className="truncate font-semibold text-ink">{e.name}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
