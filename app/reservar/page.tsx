import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listPublicBookingClubs } from "@/modules/reservations/repository";

export const dynamic = "force-dynamic";

export default async function ReservarPage() {
  const supabase = await createClient();
  const clubs = await listPublicBookingClubs(supabase);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink">Reservar una cancha</h1>
      <p className="mt-1 text-muted">
        Elegí el club y reservá tu turno online. Pagás y queda confirmado al instante.
      </p>

      {clubs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border-soft bg-surface px-4 py-10 text-center text-sm text-muted">
          Todavía no hay clubes con reserva online disponible.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {clubs.map((c) => (
            <Link
              key={c.slug}
              href={`/reservar/${c.slug}`}
              className="rounded-2xl border border-border-soft bg-surface p-4 transition-colors hover:border-accent"
            >
              <p className="text-lg font-semibold text-ink">{c.name}</p>
              <p className="text-sm text-muted">{c.city ?? "Reservá tu turno"}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-padel-600">
                Ver turnos →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
