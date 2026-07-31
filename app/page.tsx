import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoRequestForm } from "@/components/demo-request-form";
import { EventsGridRealtime } from "@/components/events-grid-realtime";
import type { EventCardData } from "@/components/event-card";
import { listPublicHomeEvents } from "@/modules/tournaments/repository";
import {
  listActivePlans,
  getPlatformSettings,
  planFeatureLabels,
} from "@/modules/plans/repository";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FlowPadel — Gestioná tu club de pádel en un solo lugar",
  description:
    "Reservas, torneos, cobros online y ocupación por WhatsApp. Sumate al Programa Fundadores.",
};

const FEATURES: { icon: string; title: string; body: string }[] = [
  { icon: "📅", title: "Agenda y reservas", body: "Tus canchas en una grilla clara. Reservá, bloqueá y cobrá turnos online o en el club." },
  { icon: "🏆", title: "Torneos completos", body: "Inscripciones, zonas, cuadro, resultados y ranking con ELO. Todo automático." },
  { icon: "💳", title: "Cobros con Mercado Pago", body: "Cobrá la seña o el total al reservar. La plata entra a tu cuenta, sin intermediarios." },
  { icon: "🔁", title: "Turnos fijos", body: "Clientes con turno recurrente y cobro mensual por adelantado, sin perseguir a nadie." },
  { icon: "🔥", title: "Motor de ocupación", body: "Publicá los turnos libres a tu grupo de WhatsApp y ofrecé descuentos last-minute automáticos." },
  { icon: "📈", title: "Comunidad y ranking", body: "Tus jugadores, su ranking y su historial. Más juego, más pertenencia, más reservas." },
];

export default async function HomePage() {
  const supabase = await createClient();
  const [eventsRaw, plans, settings] = await Promise.all([
    listPublicHomeEvents(supabase),
    listActivePlans(supabase),
    getPlatformSettings(supabase),
  ]);
  const events = (eventsRaw as unknown as EventCardData[]).slice(0, 4);

  const founderLeft = Math.max(
    0,
    settings.founder_slots_total - settings.founder_slots_taken
  );
  const founderOpen = founderLeft > 0;

  // Ejemplo de accesibilidad: plan más barato vs. 1 hora de cancha.
  const pricedMonthly = plans
    .map((p) => (p.price_amount != null ? Number(p.price_amount) : null))
    .filter((n): n is number => n != null);
  const entryMonthly = pricedMonthly.length ? Math.min(...pricedMonthly) : null;
  const entryPerDay = entryMonthly != null ? Math.round(entryMonthly / 30) : null;
  const refHour = settings.ref_court_hour_price;
  const pctOfHour =
    entryPerDay != null && refHour > 0
      ? Math.round((entryPerDay / refHour) * 100)
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-14 text-center sm:py-20">
        {founderOpen && (
          <Badge tone="open">
            Programa Fundadores · quedan {founderLeft} de{" "}
            {settings.founder_slots_total} cupos
          </Badge>
        )}
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Gestioná tu club de pádel en un solo lugar
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Reservas, torneos, cobros online y ocupación por WhatsApp. Menos
          planillas y grupos, más canchas ocupadas.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="#demo">
            <Button size="lg">Solicitar demo gratis</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="pb-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="space-y-2 py-5">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="font-semibold text-ink">{f.title}</h3>
                <p className="text-sm text-muted">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ROI */}
      <section className="pb-14">
        <h2 className="mb-1 text-center text-2xl font-semibold text-ink">
          Lo que ganás con FlowPadel
        </h2>
        <p className="mb-6 text-center text-sm text-muted">
          Valores estimados — los ajustamos con datos reales de tu club.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {settings.roi.map((r) => (
            <Card key={r.label}>
              <CardContent className="py-5">
                <p className="text-2xl font-semibold text-padel-600">{r.value}</p>
                <p className="mt-1 text-sm font-medium text-ink">{r.label}</p>
                <p className="mt-0.5 text-xs text-muted">{r.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Programa Fundadores (solo mientras haya cupos) */}
      {founderOpen && (
        <section className="pb-14">
          <Card className="border-accent">
            <CardContent className="grid gap-6 py-8 md:grid-cols-2 md:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-ink">
                    Programa Fundadores
                  </h2>
                  <Badge tone="open">
                    {founderLeft}/{settings.founder_slots_total} cupos
                  </Badge>
                </div>
                <p className="text-muted">
                  Sos de los primeros en confiar en FlowPadel — y eso vale. Te
                  bonificamos el{" "}
                  <b className="text-ink">
                    {settings.founder_discount_pct}% del costo durante{" "}
                    {settings.founder_years} años
                  </b>{" "}
                  y acompañamos el crecimiento de tu club con datos medidos:
                  ocupación, ingresos y ausencias, en números.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-ink">
                {[
                  `${settings.founder_discount_pct}% bonificado durante ${settings.founder_years} años`,
                  "Onboarding personalizado: migramos tu información y te acompañamos en el alta",
                  "Crecés con datos: medimos ocupación, ingresos y ausencias de tu club",
                  "Línea directa con el equipo que construye el producto",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Planes (dinámicos desde superadmin) */}
      {plans.length > 0 && (
        <section className="pb-14">
          <h2 className="mb-6 text-center text-2xl font-semibold text-ink">Planes</h2>
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const featured = Boolean(p.badge);
              return (
                <Card key={p.id} className={featured ? "border-accent" : undefined}>
                  <CardContent className="flex h-full flex-col gap-4 py-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                      {p.badge && <Badge tone="open">{p.badge}</Badge>}
                    </div>
                    {p.price_amount == null ? (
                      <p className="text-2xl font-semibold text-ink">A confirmar</p>
                    ) : (
                      (() => {
                        const full = Number(p.price_amount);
                        const isFounder = p.founder_eligible && founderOpen;
                        const eff = isFounder
                          ? Math.round(
                              (full * (100 - settings.founder_discount_pct)) / 100
                            )
                          : full;
                        const perDay = Math.round(eff / 30);
                        return (
                          <div>
                            <p>
                              <span className="text-3xl font-semibold text-ink">
                                {formatMoney(perDay, p.currency)}
                              </span>
                              <span className="text-sm text-muted"> /día</span>
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {formatMoney(eff, p.currency)} por mes
                              {isFounder && (
                                <>
                                  {" · "}
                                  <span className="line-through">
                                    {formatMoney(full, p.currency)}
                                  </span>
                                  {" · "}
                                  <span className="font-semibold text-accent">
                                    Fundador −{settings.founder_discount_pct}%
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        );
                      })()
                    )}
                    <ul className="flex-1 space-y-1.5 text-sm text-muted">
                      {planFeatureLabels(p).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="mt-0.5 text-accent">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="#demo" className="block">
                      <Button className="w-full" variant={featured ? "primary" : "outline"}>
                        Empezar
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {entryPerDay != null && pctOfHour != null && (
            <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-accent/40 bg-accent/5 px-5 py-4 text-center">
              <p className="text-sm text-ink">
                <b>Ponelo en perspectiva:</b> una hora de cancha vale{" "}
                {formatMoney(refHour)}. Tu plan más accesible cuesta{" "}
                <b>{formatMoney(entryPerDay)} por día</b> — apenas el{" "}
                <b className="text-accent">{pctOfHour}%</b> de alquilar una cancha
                una hora. Con varias canchas, el sistema es un gasto ínfimo.
              </p>
            </div>
          )}
          <p className="mt-4 text-center text-xs text-muted">
            Escribinos y te armamos una propuesta para tu club.
          </p>
        </section>
      )}

      {/* Demo / contacto */}
      <section id="demo" className="pb-14">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold text-ink">Pedí tu demo gratis</h2>
          <p className="mt-2 text-muted">
            Te mostramos la plataforma con tu club y coordinamos el alta.
          </p>
        </div>
        <div className="mx-auto mt-6 max-w-xl">
          <Card>
            <CardContent className="py-6">
              <DemoRequestForm />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* La app en vivo (prueba social) */}
      {events.length > 0 && (
        <section className="pb-16">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-ink">Torneos en la plataforma</h2>
            <Link
              href="/torneos"
              className="text-sm font-medium text-padel-600 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <EventsGridRealtime initialEvents={events} />
        </section>
      )}
    </div>
  );
}
