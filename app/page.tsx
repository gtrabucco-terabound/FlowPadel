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

const ROI: { value: string; label: string; note: string }[] = [
  { value: "≈30%", label: "Menos ausencias", note: "Con cobro de seña anticipado (estimado)." },
  { value: "Ocupación", label: "Gestión optimizada", note: "Te ayuda a mejorar la ocupación de tus canchas." },
  { value: "Turnos fijos", label: "Cobro optimizado", note: "Mensualizados y por adelantado, sin perseguir a nadie." },
  { value: "WhatsApp", label: "Comunicación personalizada", note: "Conocés a cada jugador; tus clientes se sienten parte." },
];

const PLANS: {
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  tag?: string;
  features: string[];
}[] = [
  {
    name: "Fundador",
    price: "$ —",
    period: "/mes",
    highlight: true,
    tag: "Cupo limitado",
    features: [
      "Todas las funciones, sin límite de canchas",
      "50% de descuento por 3 años",
      "Onboarding acompañado",
      "Soporte directo y roadmap",
    ],
  },
  {
    name: "Oro",
    price: "$ —",
    period: "/mes",
    features: [
      "Todo lo de Silver",
      "Alcance a todos los jugadores de la plataforma",
      "Cobros con Mercado Pago",
      "Motor de ocupación (WhatsApp)",
    ],
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const eventsRaw = await listPublicHomeEvents(supabase);
  const events = (eventsRaw as unknown as EventCardData[]).slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-14 text-center sm:py-20">
        <Badge tone="open">Programa Fundadores · cupos limitados</Badge>
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
          {ROI.map((r) => (
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

      {/* Programa Fundadores */}
      <section className="pb-14">
        <Card>
          <CardContent className="grid gap-6 py-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-ink">
                Programa Fundadores
              </h2>
              <p className="mt-2 text-muted">
                Buscamos los primeros clubes para crecer juntos. A cambio de tu
                feedback, te damos 50% de descuento por 3 años, onboarding
                acompañado y acceso directo al equipo.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-ink">
              {[
                "50% de descuento durante 3 años",
                "Migramos tu información y te acompañamos en el alta",
                "Priorizamos las funciones que tu club necesita",
                "Soporte directo, sin tickets",
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

      {/* Planes */}
      <section className="pb-14">
        <h2 className="mb-6 text-center text-2xl font-semibold text-ink">Planes</h2>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {PLANS.map((p) => (
            <Card key={p.name} className={p.highlight ? "border-accent" : undefined}>
              <CardContent className="space-y-4 py-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                  {p.tag && <Badge tone="open">{p.tag}</Badge>}
                </div>
                <p>
                  <span className="text-3xl font-semibold text-ink">{p.price}</span>
                  <span className="text-sm text-muted">{p.period}</span>
                </p>
                <ul className="space-y-1.5 text-sm text-muted">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-accent">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="#demo" className="block">
                  <Button className="w-full" variant={p.highlight ? "primary" : "outline"}>
                    Empezar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Precios a confirmar. Escribinos y te armamos una propuesta para tu club.
        </p>
      </section>

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
