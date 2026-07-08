import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  PublicBooking,
  type PublicCourt,
  type PublicBookingRow,
} from "@/components/public-booking";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
function todayAR(): string {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

type DayData = {
  club: { name: string; city: string | null; pay_at_club: boolean } | null;
  courts: PublicCourt[];
  bookings: PublicBookingRow[];
};

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
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.rpc("public_court_day", { p_slug: slug, p_date: day }),
    supabase.auth.getUser(),
  ]);
  const parsed = (data ?? null) as unknown as DayData | null;
  if (!parsed || !parsed.club) notFound();

  // Si está logueado, precargamos su nombre/teléfono para reservar directo.
  let me: { name: string; phone: string } | null = null;
  if (auth?.user) {
    const { data: player } = await supabase
      .from("players")
      .select("full_name, phone")
      .eq("profile_id", auth.user.id)
      .maybeSingle();
    if (player?.full_name) {
      me = { name: player.full_name, phone: player.phone ?? "" };
    }
  }

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
        me={me}
        payAtClub={parsed.club.pay_at_club}
      />
    </div>
  );
}
