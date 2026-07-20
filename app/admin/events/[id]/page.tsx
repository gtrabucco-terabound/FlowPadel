import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { eventStatusMeta, eventTypeLabel, formatDate } from "@/lib/format";
import { EventManager } from "@/components/admin/event-manager";
import { getEventManagementData } from "@/modules/tournaments/repository";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const data = await getEventManagementData(supabase, id, ctx.activeClubId);
  if (!data) notFound();

  const event = data.event;
  const meta = eventStatusMeta(event.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/events"
          className="text-sm font-semibold text-padel-600 hover:text-padel-700"
        >
          ← Eventos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{event.name}</h1>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <p className="text-sm text-muted">
          {eventTypeLabel(event.event_type)} · {formatDate(event.start_date)}
        </p>
      </div>

      <EventManager data={data} />
    </div>
  );
}
