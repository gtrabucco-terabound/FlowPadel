import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoRequestForm } from "@/components/demo-request-form";

export const metadata: Metadata = {
  title: "FlowPadel para clubes — Gestioná tu club de pádel",
  description:
    "Reservas, agenda, torneos, cobros online y ocupación por WhatsApp en un solo lugar. Sumate al Programa Fundadores.",
};

const FEATURES: { icon: string; title: string; body: string }[] = [
  { icon: "📅", title: "Agenda y reservas", body: "Tus canchas en una grilla clara. Reservá, bloqueá y cobrá turnos online o en el club." },
  { icon: "🏆", title: "Torneos completos", body: "Inscripciones, zonas, cuadro, resultados y ranking con ELO. Todo automático." },
  { icon: "💳", title: "Cobros con Mercado Pago", body: "Cobrá la seña o el total al reservar. La plata entra a tu cuenta, sin intermediarios." },
  { icon: "🔁", title: "Turnos fijos", body: "Clientes con turno recurrente y cobro mensual por adelantado, sin perseguir a nadie." },
  { icon: "🔥", title: "Motor de ocupación", body: "Publicá los turnos libres a tu grupo de WhatsApp y ofrecé descuentos last-minute automáticos." },
  { icon: "📈", title: "Comunidad y ranking", body: "Tus jugadores, su ranking y su historial. Más juego, más pertenencia, más reservas." },
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
      "Precio preferencial de por vida",
      "Onboarding acompañado",
      "Soporte directo y roadmap",
    ],
  },
  {
    name: "Pro",
    price: "$ —",
    period: "/mes",
    features: [
      "Reservas, agenda y turnos fijos",
      "Torneos y ranking",
      "Cobros con Mercado Pago",
      "Motor de ocupación (WhatsApp)",
    ],
  },
];

export default function ClubesLandingPage() {
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
          <Link href="/reservar">
            <Button size="lg" variant="outline">
              Ver la app funcionando
            </Button>
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
                feedback, te damos precio preferencial de por vida, onboarding
                acompañado y acceso directo al equipo.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-ink">
              {[
                "Precio preferencial para siempre",
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
        <h2 className="mb-6 text-center text-2xl font-semibold text-ink">
          Planes
        </h2>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              className={p.highlight ? "border-accent" : undefined}
            >
              <CardContent className="space-y-4 py-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                  {p.tag && <Badge tone="open">{p.tag}</Badge>}
                </div>
                <p>
                  <span className="text-3xl font-semibold text-ink">
                    {p.price}
                  </span>
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
                  <Button
                    className="w-full"
                    variant={p.highlight ? "primary" : "outline"}
                  >
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
      <section id="demo" className="pb-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold text-ink">
            Pedí tu demo gratis
          </h2>
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
    </div>
  );
}
