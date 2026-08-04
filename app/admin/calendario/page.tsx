import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventStatusMeta, formatDateRange } from "@/lib/format";
import { CalendarNav } from "@/components/admin/calendar-nav";
import {
  listClubCalendarEvents,
  type CalendarEvent as Ev,
} from "@/modules/tournaments/repository";
import {
  listUpcomingLessons,
  listGroupSessions,
} from "@/modules/coaches/repository";

export const dynamic = "force-dynamic";

type View = "dia" | "semana" | "mes";
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function todayISO(): string {
  return iso(new Date(Date.now() - 3 * 3600 * 1000));
}
/** Rango [desde, hasta] (YYYY-MM-DD) según la vista. */
function rangeFor(view: View, dateISO: string): [string, string] {
  const d = new Date(dateISO + "T12:00:00");
  if (view === "dia") return [dateISO, dateISO];
  if (view === "semana") {
    const js = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() + (js === 0 ? -6 : 1 - js));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [iso(mon), iso(sun)];
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [iso(first), iso(last)];
}

const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const courtLabel = (c: { name: string; number: number | null } | null) =>
  c ? `${c.number ? `#${c.number} ` : ""}${c.name}` : null;
const dayKey = (s: string) => s.slice(0, 10);

function prettyDay(dateISO: string): string {
  return new Date(dateISO + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** ¿Se solapan los rangos de fecha de dos torneos? (día suelto = start=end) */
function overlap(a: Ev, b: Ev): boolean {
  if (!a.start_date || !b.start_date) return false;
  const aStart = dayKey(a.start_date);
  const bStart = dayKey(b.start_date);
  const aEnd = a.end_date ? dayKey(a.end_date) : aStart;
  const bEnd = b.end_date ? dayKey(b.end_date) : bStart;
  return aStart <= bEnd && bStart <= aEnd;
}

type Item = {
  key: string;
  kind: "tournament" | "lesson" | "group";
  date: string;
  time: number | null;
  title: string;
  subtitle: string | null;
  statusLabel: string | null;
  statusTone: ReturnType<typeof eventStatusMeta>["tone"] | undefined;
  clash: boolean;
  endLabel: string | null;
};

const KIND_META: Record<Item["kind"], { icon: string; label: string }> = {
  tournament: { icon: "🏆", label: "Torneo" },
  lesson: { icon: "🎾", label: "Clase" },
  group: { icon: "👥", label: "Entrenamiento" },
};

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const view: View = sp.view === "dia" || sp.view === "semana" ? sp.view : "mes";
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();
  const [from, to] = rangeFor(view, date);

  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [events, lessons, groups] = await Promise.all([
    listClubCalendarEvents(supabase, ctx.activeClubId),
    listUpcomingLessons(supabase, ctx.activeClubId, from),
    listGroupSessions(supabase, ctx.activeClubId, from),
  ]);

  // Choque de fechas: solo entre torneos con fecha (se calcula sobre todos).
  const datedEvents = events.filter((e) => e.start_date);
  const clash = new Set<string>();
  for (let i = 0; i < datedEvents.length; i++) {
    for (let j = i + 1; j < datedEvents.length; j++) {
      if (overlap(datedEvents[i], datedEvents[j])) {
        clash.add(datedEvents[i].id);
        clash.add(datedEvents[j].id);
      }
    }
  }

  const items: Item[] = [];

  for (const e of datedEvents) {
    const st = eventStatusMeta(e.status);
    items.push({
      key: `t-${e.id}`,
      kind: "tournament",
      date: dayKey(e.start_date as string),
      time: null,
      title: e.name,
      subtitle: e.venue ? `📍 ${e.venue}` : null,
      statusLabel: st.label,
      statusTone: st.tone,
      clash: clash.has(e.id),
      endLabel: formatDateRange(e.start_date, e.end_date),
    });
  }
  for (const l of lessons) {
    items.push({
      key: `l-${l.id}`,
      kind: "lesson",
      date: dayKey(l.lesson_date),
      time: l.start_minutes,
      title: `Clase · ${l.customer_name ?? "Alumno"}`,
      subtitle: [l.coach?.name, courtLabel(l.court)].filter(Boolean).join(" · ") || null,
      statusLabel: null,
      statusTone: undefined,
      clash: false,
      endLabel: null,
    });
  }
  for (const g of groups) {
    const parts = (g.participants ?? []).filter((p) => p.status !== "cancelled").length;
    const end = g.start_minutes + g.num_slots * (g.slot_minutes || 90);
    items.push({
      key: `g-${g.id}`,
      kind: "group",
      date: dayKey(g.session_date),
      time: g.start_minutes,
      title: `Entrenamiento grupal · ${parts}/${g.capacity}`,
      subtitle: [g.coach?.name, courtLabel(g.court)].filter(Boolean).join(" · ") || null,
      statusLabel: g.status === "confirmed" ? "Confirmado" : null,
      statusTone: g.status === "confirmed" ? "open" : undefined,
      clash: false,
      endLabel: `${hhmm(g.start_minutes)}–${hhmm(end)}`,
    });
  }

  // Filtramos al rango de la vista.
  const inRange = items.filter((it) => it.date >= from && it.date <= to);

  const byDate = new Map<string, Item[]>();
  for (const it of inRange) {
    (byDate.get(it.date) ?? byDate.set(it.date, []).get(it.date)!).push(it);
  }
  const dates = [...byDate.keys()].sort();
  for (const d of dates) byDate.get(d)!.sort((a, b) => (a.time ?? -1) - (b.time ?? -1));

  const undated = events.filter((e) => !e.start_date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Calendario</h1>
        <p className="mt-1 text-sm text-muted">
          Torneos, clases y entrenamientos del club por fecha. Se avisa si dos torneos se pisan.
        </p>
      </div>

      <CalendarNav view={view} date={date} />

      {inRange.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted">
            No hay nada agendado en este {view === "dia" ? "día" : view === "semana" ? "semana" : "mes"}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {dates.map((d) => (
            <div key={d}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {prettyDay(d)}
              </p>
              <div className="space-y-2">
                {byDate.get(d)!.map((it) => {
                  const meta = KIND_META[it.kind];
                  return (
                    <div
                      key={it.key}
                      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
                        it.clash
                          ? "border-amber-400/50 bg-amber-400/10"
                          : "border-border-soft bg-surface"
                      }`}
                    >
                      <span className="text-lg" title={meta.label}>{meta.icon}</span>
                      {it.time != null && (
                        <span className="font-mono text-sm font-semibold text-ink">
                          {it.endLabel && it.kind === "group" ? it.endLabel : hhmm(it.time)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-ink">{it.title}</p>
                          {it.statusLabel && <Badge tone={it.statusTone}>{it.statusLabel}</Badge>}
                          {it.clash && <Badge tone="live">⚠️ Choque de fecha</Badge>}
                        </div>
                        {(it.subtitle || (it.kind === "tournament" && it.endLabel)) && (
                          <p className="text-xs text-muted">
                            {it.kind === "tournament" ? it.endLabel : it.subtitle}
                            {it.kind === "tournament" && it.subtitle ? ` · ${it.subtitle}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {undated.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Torneos sin fecha definida
          </p>
          <div className="space-y-2">
            {undated.map((e) => {
              const st = eventStatusMeta(e.status);
              return (
                <div key={e.id} className="flex items-center gap-2 rounded-xl border border-border-soft bg-surface px-4 py-3">
                  <span className="text-lg">🏆</span>
                  <p className="truncate font-semibold text-ink">{e.name}</p>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
