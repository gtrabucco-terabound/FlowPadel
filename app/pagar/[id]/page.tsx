import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

type PayInfo = {
  checkout_url: string | null;
  status: string;
  paid: boolean;
  amount: number | null;
  date: string;
  start: number;
  club: string;
  court: string | null;
  court_number: number | null;
} | null;

async function load(id: string): Promise<PayInfo> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_booking_payinfo", { p_id: id });
  return (data ?? null) as unknown as PayInfo;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const info = await load(id);
  const title = info
    ? `Pagá tu turno · ${info.club}`
    : "Pago de turno · FlowPadel";
  const desc = info
    ? `${info.court ?? "Cancha"} · ${info.date} ${hhmm(info.start)}${info.amount ? ` · $${info.amount}` : ""}`
    : "Reservá tu cancha en FlowPadel";
  return {
    title,
    description: desc,
    openGraph: { title, description: desc },
  };
}

export default async function PagarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const info = await load(id);

  // Si hay link de pago y sigue en espera → redirige directo a Mercado Pago.
  if (info?.checkout_url && info.status === "held" && !info.paid) {
    redirect(info.checkout_url);
  }

  const paid = info?.paid || info?.status === "reserved";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-2xl border border-border-soft bg-surface p-8">
        <div className="text-2xl font-bold text-ink">
          Flow<span className="text-accent">Padel</span>
        </div>
        {!info ? (
          <p className="mt-4 text-muted">No encontramos esta reserva.</p>
        ) : paid ? (
          <>
            <p className="mt-4 text-lg font-semibold text-emerald-500">✓ Turno confirmado</p>
            <p className="mt-1 text-sm text-muted">
              {info.court} · {info.date} {hhmm(info.start)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-lg font-semibold text-ink">Este turno ya no está disponible</p>
            <p className="mt-1 text-sm text-muted">
              El tiempo de reserva venció. Volvé a pedir el turno por WhatsApp.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
