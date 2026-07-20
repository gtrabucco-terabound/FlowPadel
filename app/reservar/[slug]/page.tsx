import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicBooking } from "@/components/public-booking";
import { getPublicCourtDay } from "@/modules/reservations/repository";
import { getPlayerContact } from "@/modules/players/repository";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
function todayAR(): string {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export default async function ReservarClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date } = await searchParams;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayAR();

  const supabase = await createClient();
  const [parsed, { data: auth }] = await Promise.all([
    getPublicCourtDay(supabase, slug, day),
    supabase.auth.getUser(),
  ]);
  if (!parsed || !parsed.club) notFound();

  // Si está logueado, precargamos su nombre/teléfono para reservar directo.
  const me = auth?.user
    ? await getPlayerContact(supabase, auth.user.id)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/reservar" className="text-sm font-semibold text-padel-600 hover:text-padel-700">
        ← Clubes
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{parsed.club.name}</h1>
      <p className="mt-1 text-muted">
        {parsed.club.city ? `${parsed.club.city} · ` : ""}Elegí un turno libre y reservá con pago online.
      </p>

      <PublicBooking
        slug={slug}
        date={day}
        courts={parsed.courts ?? []}
        bookings={parsed.bookings ?? []}
        offers={parsed.offers ?? []}
        me={me}
        payAtClub={parsed.club.pay_at_club}
      />
    </div>
  );
}
