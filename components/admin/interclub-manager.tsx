"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  InterclubTeam,
  InterclubPair,
  SeriesView,
  SeriesLine,
} from "@/modules/interclub/repository";
import {
  createInterclubLiga,
  joinInterclubLiga,
  removeInterclubTeam,
  generateInterclubFixture,
  saveInterclubCategories,
  saveInterclubPair,
  saveInterclubLine,
  confirmInterclubTeam,
  removeInterclubLiga,
} from "@/app/admin/interclub/actions";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const inputCls =
  "rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const STD_CATS = ["1ra", "2da", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"];

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

/* ---- Alta / sumarse (listado) ---- */
export function NewLigaForm() {
  const router = useRouter();
  const { run, pending, msg } = useRun();
  return (
    <form
      action={(fd) => run(() => createInterclubLiga(fd), (r) => r.ok && r.id && router.push(`/admin/interclub/${r.id}`))}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="space-y-1">
        <span className="block text-xs font-medium text-ink">Crear una liga interclub</span>
        <input name="name" required placeholder="Ej. Interclub Verano 2026" className={`${inputCls} w-72`} />
      </label>
      <Button size="sm" type="submit" disabled={pending}>{pending ? "Creando…" : "Crear liga"}</Button>
      {msg && <span className="text-sm text-red-500">{msg}</span>}
    </form>
  );
}

export function JoinLigaForm() {
  const router = useRouter();
  const { run, pending, msg } = useRun();
  return (
    <form
      action={(fd) => run(() => joinInterclubLiga(fd), (r) => r.ok && r.id && router.push(`/admin/interclub/${r.id}`))}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="space-y-1">
        <span className="block text-xs font-medium text-ink">Sumarme a una liga (con código)</span>
        <input name="code" required placeholder="Ej. ABC234" className={`${inputCls} w-40 uppercase`} />
      </label>
      <Button size="sm" variant="outline" type="submit" disabled={pending}>{pending ? "Sumando…" : "Sumarme"}</Button>
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
  joinCode,
  isOrganizer,
  myClubId,
  categories,
  pairsPerCat,
  teams,
  pairs,
  series,
  lines,
  players,
}: {
  ligaId: string;
  joinCode: string | null;
  isOrganizer: boolean;
  myClubId: string;
  categories: string[];
  pairsPerCat: Record<string, number>;
  teams: InterclubTeam[];
  pairs: InterclubPair[];
  series: SeriesView[];
  lines: SeriesLine[];
  players: { full_name: string; category: string | null }[];
}) {
  const router = useRouter();
  const { run, pending, msg } = useRun();
  const hasFixture = series.length > 0;
  const standings = standingsFrom(teams, series);
  const countFor = (c: string) => Math.max(1, Number(pairsPerCat[c]) || 1);
  const totalLines = categories.reduce((s, c) => s + countFor(c), 0);
  const pairName = (teamId: string, cat: string, slot: number) =>
    pairs.find((p) => p.team_id === teamId && p.category === cat && p.slot === slot)?.pair_name ?? "";

  return (
    <div className="space-y-8">
      {categories.map((c) => (
        <datalist key={c} id={`dl-${c}`}>
          {players.map((p) => (<option key={p.full_name} value={p.full_name} />))}
        </datalist>
      ))}

      {/* Código para compartir */}
      {!hasFixture && joinCode && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Código para invitar clubes</p>
              <p className="font-mono text-2xl font-bold text-accent">{joinCode}</p>
            </div>
            <p className="max-w-xs text-xs text-muted">
              Compartí este código con los clubes que quieras invitar. Cada uno se suma desde
              Interclub → “Sumarme con código”, arma su equipo y confirma.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Categorías (solo organizador) */}
      <section>
        <h2 className="mb-2 text-lg font-bold text-ink">Categorías en juego</h2>
        {hasFixture || !isOrganizer ? (
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 && <span className="text-sm text-muted">Sin categorías definidas.</span>}
            {categories.map((c) => (
              <span key={c} className="rounded-full border border-border-soft bg-canvas px-2.5 py-1 text-sm text-ink">{c}</span>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-xs text-muted">Elegí las categorías y cuántas parejas juega cada club en cada una.</p>
              <form action={(fd) => run(() => saveInterclubCategories(ligaId, fd))} className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {STD_CATS.map((c) => (
                    <label key={c} className="flex items-center gap-2 rounded-lg border border-border-soft bg-canvas px-3 py-1.5 text-sm has-[:checked]:border-accent">
                      <input type="checkbox" name="category" value={c} defaultChecked={categories.includes(c)} className="h-4 w-4 accent-accent" />
                      <span className="flex-1 font-medium text-ink">{c}</span>
                      <input type="number" name={`count_${c}`} min={1} max={6} defaultValue={countFor(c)}
                        title="Parejas por categoría" className={`${inputCls} w-14`} />
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted">El número es cuántas parejas por categoría (igual para todos los clubes).</p>
                <Button size="sm" variant="outline" type="submit" disabled={pending}>Guardar categorías</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Clubes + parejas */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Clubes participantes</h2>
        <div className="space-y-3">
          {teams.map((t) => {
            const mine = t.club_id === myClubId;
            const editable = mine && !hasFixture;
            return (
              <Card key={t.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">
                      {t.name}{mine && <span className="ml-2 text-xs font-normal text-accent">(tu club)</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      {t.confirmed ? <Badge tone="open">Confirmado</Badge> : <Badge tone="draft">Sin confirmar</Badge>}
                      {isOrganizer && !hasFixture && !mine && (
                        <button type="button" className="text-xs font-semibold text-red-500"
                          onClick={() => run(() => removeInterclubTeam(ligaId, t.id))}>Quitar</button>
                      )}
                    </div>
                  </div>
                  {categories.length === 0 ? (
                    <p className="text-xs text-muted">Falta que el organizador defina las categorías.</p>
                  ) : (
                    <div className="space-y-4">
                      {categories.map((c) => (
                        <div key={c} className="space-y-1.5">
                          <p className="text-xs font-bold uppercase tracking-wide text-accent">Categoría {c}</p>
                          {Array.from({ length: countFor(c) }, (_, i) => {
                            const slot = i + 1;
                            const [j1 = "", j2 = ""] = pairName(t.id, c, slot).split(" / ");
                            const label = countFor(c) > 1 ? `Pareja ${slot}` : "Pareja";
                            if (!editable) {
                              return (
                                <div key={slot} className="flex items-center gap-2 text-sm">
                                  <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
                                  <span className="truncate text-ink">{pairName(t.id, c, slot) || <span className="text-muted">—</span>}</span>
                                </div>
                              );
                            }
                            return (
                              <form key={slot} action={(fd) => run(() => saveInterclubPair(ligaId, c, slot, fd))} className="flex items-center gap-1.5">
                                <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
                                <input name="jugador_1" list={`dl-${c}`} defaultValue={j1} placeholder="Jugador 1" className={`${inputCls} min-w-0 flex-1`} />
                                <input name="jugador_2" list={`dl-${c}`} defaultValue={j2} placeholder="Jugador 2" className={`${inputCls} min-w-0 flex-1`} />
                                <Button size="sm" variant="ghost" type="submit" disabled={pending}>✓</Button>
                              </form>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Confirmar mi equipo */}
                  {mine && !hasFixture && categories.length > 0 && (
                    <Button size="sm" variant={t.confirmed ? "outline" : undefined} disabled={pending}
                      onClick={() => run(() => confirmInterclubTeam(ligaId, !t.confirmed))}>
                      {t.confirmed ? "Desconfirmar equipo" : "Confirmar mi equipo"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Fixture */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Fixture de series</h2>
          {isOrganizer && !hasFixture && (
            <Button size="sm" disabled={pending} onClick={() => run(() => generateInterclubFixture(ligaId))}>
              Generar fixture e iniciar
            </Button>
          )}
        </div>
        {msg && <p className="mb-2 text-sm font-semibold text-red-600">{msg}</p>}
        {!hasFixture ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted">
            {isOrganizer
              ? "Cuando todos los clubes confirmen su equipo, generá el fixture (todos contra todos)."
              : "Cargá tu equipo y confirmalo. El organizador genera el fixture cuando todos confirmaron."}
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {series.map((s) => (<SeriesCard key={s.id} ligaId={ligaId} s={s} categories={categories} countFor={countFor} totalLines={totalLines} pairs={pairs} lines={lines} canEdit={isOrganizer} />))}
          </div>
        )}
      </section>

      {/* Tabla */}
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

      {/* Eliminar (solo organizador) */}
      {isOrganizer && (
        <section className="border-t border-border-soft pt-4">
          <Button size="sm" variant="ghost" disabled={pending} className="text-red-500 hover:text-red-600"
            onClick={() => { if (confirm("¿Borrar esta liga interclub? No se puede deshacer.")) run(() => removeInterclubLiga(ligaId), () => router.push("/admin/interclub")); }}>
            Borrar liga
          </Button>
        </section>
      )}
    </div>
  );
}

function SeriesCard({
  ligaId, s, categories, countFor, totalLines, pairs, lines, canEdit,
}: {
  ligaId: string; s: SeriesView; categories: string[]; countFor: (c: string) => number; totalLines: number; pairs: InterclubPair[]; lines: SeriesLine[]; canEdit: boolean;
}) {
  const { run, pending } = useRun();
  const pairName = (teamId: string, cat: string, slot: number) =>
    pairs.find((p) => p.team_id === teamId && p.category === cat && p.slot === slot)?.pair_name ?? "—";
  const lineOf = (cat: string, slot: number) => lines.find((l) => l.series_id === s.id && l.category === cat && l.slot === slot) ?? null;
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
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-sm font-semibold text-ink">{s.home_cats_won ?? 0} – {s.away_cats_won ?? 0}</span>
        </div>
        <div className="space-y-3">
          {categories.map((c) => (
            <div key={c} className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-accent">Categoría {c}</p>
              {Array.from({ length: countFor(c) }, (_, i) => {
                const slot = i + 1;
                const line = lineOf(c, slot);
                const done = line && line.home_score != null && line.away_score != null;
                return (
                  <div key={slot} className="flex flex-wrap items-center gap-2 rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm">
                    {countFor(c) > 1 && <span className="w-16 shrink-0 text-xs text-muted">Pareja {slot}</span>}
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {pairName(s.home_team_id, c, slot)} <span className="text-muted">vs</span> {pairName(s.away_team_id, c, slot)}
                    </span>
                    {canEdit ? (
                      <form action={(fd) => run(() => saveInterclubLine(ligaId, s.id, c, slot, totalLines, fd))} className="flex items-center gap-1.5">
                        <input name="home_score" type="number" min={0} required defaultValue={line?.home_score ?? ""} aria-label="Games local" className={`${inputCls} w-12`} />
                        <span className="text-muted">–</span>
                        <input name="away_score" type="number" min={0} required defaultValue={line?.away_score ?? ""} aria-label="Games visitante" className={`${inputCls} w-12`} />
                        <Button size="sm" variant={done ? "ghost" : "outline"} type="submit" disabled={pending}>{done ? "✓" : "Guardar"}</Button>
                      </form>
                    ) : (
                      <span className="font-mono text-sm text-ink">{done ? `${line!.home_score}–${line!.away_score}` : "—"}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
