"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  InterclubTeam,
  InterclubPair,
  SeriesView,
  SeriesLine,
} from "@/modules/interclub/repository";
import {
  createInterclubLiga,
  addInterclubTeam,
  removeInterclubTeam,
  generateInterclubFixture,
  saveInterclubCategories,
  saveInterclubPair,
  saveInterclubLine,
  removeInterclubLiga,
} from "@/app/admin/interclub/actions";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const inputCls =
  "rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, onOk?: (r: Result) => void) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) setMsg(r.error);
      else {
        onOk?.(r);
        router.refresh();
      }
    });
  return { run, pending, msg };
}

/* ---- Alta de liga ---- */
export function NewLigaForm() {
  const router = useRouter();
  const { run, pending, msg } = useRun();
  return (
    <form
      action={(fd) => run(() => createInterclubLiga(fd), (r) => r.ok && r.id && router.push(`/admin/interclub/${r.id}`))}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="space-y-1">
        <span className="block text-xs font-medium text-ink">Nueva liga interclub</span>
        <input name="name" required placeholder="Ej. Interclub Verano 2026" className={`${inputCls} w-72`} />
      </label>
      <Button size="sm" type="submit" disabled={pending}>{pending ? "Creando…" : "Crear liga"}</Button>
      {msg && <span className="text-sm text-red-500">{msg}</span>}
    </form>
  );
}

/* ---- Tabla de clubes ---- */
type Standing = { id: string; name: string; pj: number; g: number; e: number; p: number; catsFor: number; catsAgainst: number; pts: number };
function standingsFrom(teams: InterclubTeam[], series: SeriesView[]): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of teams) map.set(t.id, { id: t.id, name: t.name, pj: 0, g: 0, e: 0, p: 0, catsFor: 0, catsAgainst: 0, pts: 0 });
  for (const s of series) {
    if (s.status !== "completed" || s.home_cats_won == null || s.away_cats_won == null) continue;
    const h = map.get(s.home_team_id); const a = map.get(s.away_team_id);
    if (!h || !a) continue;
    h.pj++; a.pj++;
    h.catsFor += s.home_cats_won; h.catsAgainst += s.away_cats_won;
    a.catsFor += s.away_cats_won; a.catsAgainst += s.home_cats_won;
    if (s.home_cats_won > s.away_cats_won) { h.g++; a.p++; h.pts += 3; }
    else if (s.home_cats_won < s.away_cats_won) { a.g++; h.p++; a.pts += 3; }
    else { h.e++; a.e++; h.pts++; a.pts++; }
  }
  return [...map.values()].sort((x, y) => y.pts - x.pts || (y.catsFor - y.catsAgainst) - (x.catsFor - x.catsAgainst));
}

/* ---- Manager de una liga ---- */
export function LigaManager({
  ligaId,
  categories,
  teams,
  pairs,
  series,
  lines,
}: {
  ligaId: string;
  categories: string[];
  teams: InterclubTeam[];
  pairs: InterclubPair[];
  series: SeriesView[];
  lines: SeriesLine[];
}) {
  const router = useRouter();
  const { run, pending, msg } = useRun();
  const hasFixture = series.length > 0;
  const standings = standingsFrom(teams, series);
  const pairName = (teamId: string, cat: string) =>
    pairs.find((p) => p.team_id === teamId && p.category === cat)?.pair_name ?? "";

  return (
    <div className="space-y-8">
      {/* Categorías en juego */}
      <section>
        <h2 className="mb-2 text-lg font-bold text-ink">Categorías en juego</h2>
        {hasFixture ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="rounded-full border border-border-soft bg-canvas px-2.5 py-1 text-sm text-ink">{c}</span>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-xs text-muted">Separá con comas. Ej: 5ta, 6ta, 7ta, 8va</p>
              <form action={(fd) => run(() => saveInterclubCategories(ligaId, fd))} className="flex flex-wrap items-end gap-2">
                <input name="categories" defaultValue={categories.join(", ")} placeholder="5ta, 6ta, 7ta, 8va" className={`${inputCls} w-96`} />
                <Button size="sm" variant="outline" type="submit" disabled={pending}>Guardar categorías</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Clubes + parejas por categoría */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Clubes participantes</h2>
        <div className="space-y-3">
          {teams.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{t.name}</p>
                  {!hasFixture && (
                    <button type="button" className="text-xs font-semibold text-red-500"
                      onClick={() => run(() => removeInterclubTeam(ligaId, t.id))}>Quitar club</button>
                  )}
                </div>
                {categories.length === 0 ? (
                  <p className="text-xs text-muted">Definí las categorías arriba para cargar las parejas.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categories.map((c) => (
                      <form key={c} action={(fd) => run(() => saveInterclubPair(ligaId, t.id, c, fd))}
                        className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-xs font-semibold text-muted">{c}</span>
                        <input name="pair_name" defaultValue={pairName(t.id, c)} placeholder="Pareja"
                          className={`${inputCls} flex-1`} disabled={hasFixture} />
                        {!hasFixture && (
                          <Button size="sm" variant="ghost" type="submit" disabled={pending}>✓</Button>
                        )}
                      </form>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!hasFixture && (
            <Card>
              <CardContent className="py-4">
                <form action={(fd) => run(() => addInterclubTeam(ligaId, fd))} className="flex flex-wrap items-end gap-2">
                  <input name="name" required placeholder="Ej. Club Norte" className={inputCls} />
                  <Button size="sm" variant="outline" type="submit" disabled={pending}>+ Club</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Fixture */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Fixture de series</h2>
          {!hasFixture && (
            <Button size="sm" disabled={pending}
              onClick={() => run(() => generateInterclubFixture(ligaId))}>
              Generar fixture e iniciar
            </Button>
          )}
        </div>
        {msg && <p className="mb-2 text-sm font-semibold text-red-600">{msg}</p>}
        {!hasFixture ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted">
            Cargá categorías, clubes y sus parejas, y generá el fixture (todos contra todos).
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {series.map((s) => (
              <SeriesCard key={s.id} ligaId={ligaId} s={s} categories={categories} pairs={pairs} lines={lines} />
            ))}
          </div>
        )}
      </section>

      {/* Tabla de clubes */}
      {hasFixture && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Tabla de clubes</h2>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-left text-xs uppercase text-muted">
                    <th className="px-4 py-3">#</th><th className="px-4 py-3">Club</th>
                    <th className="px-2 py-3 text-center">PJ</th><th className="px-2 py-3 text-center">G</th>
                    <th className="px-2 py-3 text-center">E</th><th className="px-2 py-3 text-center">P</th>
                    <th className="px-2 py-3 text-center">Cat</th><th className="px-2 py-3 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3 font-semibold text-muted">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                      <td className="px-2 py-3 text-center">{s.pj}</td>
                      <td className="px-2 py-3 text-center">{s.g}</td>
                      <td className="px-2 py-3 text-center">{s.e}</td>
                      <td className="px-2 py-3 text-center">{s.p}</td>
                      <td className="px-2 py-3 text-center">{s.catsFor}–{s.catsAgainst}</td>
                      <td className="px-2 py-3 text-center font-bold text-accent">{s.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Eliminar liga */}
      <section className="border-t border-border-soft pt-4">
        <Button size="sm" variant="ghost" disabled={pending}
          className="text-red-500 hover:text-red-600"
          onClick={() => {
            if (confirm("¿Borrar esta liga interclub? No se puede deshacer.")) {
              run(() => removeInterclubLiga(ligaId), () => router.push("/admin/interclub"));
            }
          }}>
          Borrar liga
        </Button>
      </section>
    </div>
  );
}

function SeriesCard({
  ligaId,
  s,
  categories,
  pairs,
  lines,
}: {
  ligaId: string;
  s: SeriesView;
  categories: string[];
  pairs: InterclubPair[];
  lines: SeriesLine[];
}) {
  const { run, pending } = useRun();
  const pairName = (teamId: string, cat: string) =>
    pairs.find((p) => p.team_id === teamId && p.category === cat)?.pair_name ?? "—";
  const lineOf = (cat: string) => lines.find((l) => l.series_id === s.id && l.category === cat) ?? null;
  const homeWins = s.status === "completed" && (s.home_cats_won ?? 0) > (s.away_cats_won ?? 0);
  const awayWins = s.status === "completed" && (s.away_cats_won ?? 0) > (s.home_cats_won ?? 0);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-ink">
            <span className={homeWins ? "text-ink" : "text-muted"}>{s.home?.name ?? "Club"}</span>
            <span className="px-2 text-muted">vs</span>
            <span className={awayWins ? "text-ink" : "text-muted"}>{s.away?.name ?? "Club"}</span>
          </p>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-sm font-semibold text-ink">
            {s.home_cats_won ?? 0} – {s.away_cats_won ?? 0}
          </span>
        </div>
        <div className="space-y-1.5">
          {categories.map((c) => {
            const line = lineOf(c);
            const done = line && line.home_score != null && line.away_score != null;
            return (
              <div key={c} className="flex flex-wrap items-center gap-2 rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm">
                <span className="w-8 shrink-0 text-xs font-semibold text-muted">{c}</span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {pairName(s.home_team_id, c)} <span className="text-muted">vs</span> {pairName(s.away_team_id, c)}
                </span>
                <form action={(fd) => run(() => saveInterclubLine(ligaId, s.id, c, categories.length, fd))}
                  className="flex items-center gap-1.5">
                  <input name="home_score" type="number" min={0} required defaultValue={line?.home_score ?? ""}
                    aria-label="Games local" className={`${inputCls} w-12`} />
                  <span className="text-muted">–</span>
                  <input name="away_score" type="number" min={0} required defaultValue={line?.away_score ?? ""}
                    aria-label="Games visitante" className={`${inputCls} w-12`} />
                  <Button size="sm" variant={done ? "ghost" : "outline"} type="submit" disabled={pending}>
                    {done ? "✓" : "Guardar"}
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
