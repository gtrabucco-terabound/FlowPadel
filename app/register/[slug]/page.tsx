import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "@/components/registration-form";
import { eventTypeLabel, formatDateRange } from "@/lib/format";
import {
  getPublicEventForRegistration,
  getEventApprovedCount,
} from "@/modules/tournaments/repository";
import {
  listClubsForSelect,
  getPlayerRegistrationPrefill,
} from "@/modules/players/repository";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const event = await getPublicEventForRegistration(supabase, slug);

  if (!event) notFound();

  // Cupo: si ya hay tantas inscripciones aprobadas como el máximo, avisamos que
  // las nuevas quedan en lista de espera.
  let cupoFull = false;
  if (event.max_teams != null) {
    const approvedCount = await getEventApprovedCount(supabase, event.id);
    cupoFull = approvedCount >= event.max_teams;
  }

  const clubs = await listClubsForSelect(supabase);

  // Si el usuario está logueado, precargamos sus datos en "Jugador 1" y
  // ocultamos "Crear cuenta" (ya tiene una).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user
    ? await getPlayerRegistrationPrefill(supabase, user.id)
    : null;

  if (event.status !== "open") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-ink">{event.name}</h1>
        <p className="mt-3 text-muted">
          Las inscripciones para este evento no están abiertas.
        </p>
        <Link
          href={`/event/${event.slug}`}
          className="mt-4 inline-block font-semibold text-padel-600"
        >
          Ver detalle del evento →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        href="/"
        className="text-sm font-semibold text-padel-600 hover:text-padel-700"
      >
        ← Volver
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-ink">
        Inscripción
      </h1>
      <p className="text-muted">
        {eventTypeLabel(event.event_type)} · {event.name}
      </p>
      <p className="mb-6 text-sm text-muted">
        {formatDateRange(event.start_date, event.end_date)}
      </p>

      {cupoFull && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>El cupo está completo.</strong> Podés anotarte igual en{" "}
          <strong>lista de espera</strong> — si se libera un lugar o el club abre
          más, te avisamos.
        </div>
      )}

      <RegistrationForm
        slug={event.slug}
        eventName={event.name}
        isTournament={event.event_type === "tournament"}
        eventModality={event.modality}
        categorySystem={event.category_system}
        categoryValue={event.category_value}
        clubs={clubs ?? []}
        isLoggedIn={!!user}
        me={me}
      />
    </div>
  );
}
