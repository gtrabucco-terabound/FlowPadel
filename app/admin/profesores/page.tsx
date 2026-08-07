import { requireFeature } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { getCoachesReport } from "@/modules/coaches/repository";

export const dynamic = "force-dynamic";

const DIAS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function hhmm(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function monthRange(): { from: string; to: string; today: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const p = (n: number) => String(n).padStart(2, "0");
  const from = `${y}-${p(mo + 1)}-01`;
  const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const to = `${y}-${p(mo + 1)}-${p(last)}`;
  const today = `${y}-${p(mo + 1)}-${p(now.getUTCDate())}`;
  return { from, to, today };
}

function fmtDia(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const js = d.getUTCDay();
  return `${DIAS[js === 0 ? 7 : js]} ${d.getUTCDate()}`;
}

export default async function ProfesoresPage() {
  const ctx = await requireFeature("lessons");
  const supabase = await createClient();
  const { from, to, today } = monthRange();
  const report = await getCoachesReport(supabase, ctx.activeClubId, from, to, today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Profesores</h1>
        <p className="text-sm text-muted">
          Actividad del mes por profe: clases, grupos, alumnos e ingresos, con su
          disponibilidad y próximas actividades.
        </p>
      </div>

      {report.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            Todavía no hay profesores cargados. Agregalos en Configuración.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {report.map((r) => (
            <Card key={r.coach.id}>
              <CardContent className="space-y-4 py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-ink">
                    {r.coach.name}{" "}
                    {!r.coach.active && (
                      <span className="align-middle text-xs font-normal text-muted">
                        · inactivo
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {r.weekdays.length === 0 ? (
                      <span className="text-xs text-faint">Sin disponibilidad</span>
                    ) : (
                      r.weekdays.map((w) => (
                        <Badge key={w} tone="neutral">
                          {DIAS[w]}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <Metric label="Clases" value={r.clasesMes} />
                  <Metric label="Grupos" value={r.gruposMes} />
                  <Metric label="Alumnos" value={r.alumnosMes} />
                  <Metric label="Ingreso clases" value={formatMoney(r.ingresoMes)} />
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Próximas actividades
                  </p>
                  {r.proximas.length === 0 ? (
                    <p className="text-sm text-faint">Nada agendado.</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-ink">
                      {r.proximas.map((p, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Badge tone={p.kind === "clase" ? "open" : "live"}>
                            {p.kind === "clase" ? "Clase" : "Grupo"}
                          </Badge>
                          {fmtDia(p.date)} · {hhmm(p.start)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
