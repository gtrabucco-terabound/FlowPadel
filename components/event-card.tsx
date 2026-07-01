import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  eventStatusMeta,
  eventTypeLabel,
  formatDateRange,
  formatModalityCategory,
} from "@/lib/format";
import type { Tables } from "@/lib/database.types";

export type EventCardData = Pick<
  Tables<"events">,
  | "id"
  | "name"
  | "slug"
  | "event_type"
  | "status"
  | "start_date"
  | "end_date"
  | "modality"
  | "category_system"
  | "category_value"
> & {
  club?: { name: string | null } | null;
};

export function EventCard({ event }: { event: EventCardData }) {
  const status = eventStatusMeta(event.status);
  const isOpen = event.status === "open";
  const modCat = formatModalityCategory(event);

  return (
    <Card className="flex flex-col transition-colors hover:border-border-strong">
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="fp-microlabel text-padel-600">
            {eventTypeLabel(event.event_type)}
          </span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <h3 className="text-lg font-semibold leading-snug text-ink">
          {event.name}
        </h3>

        {modCat && (
          <Badge tone="neutral" className="w-fit">
            {modCat}
          </Badge>
        )}

        <div className="mt-auto space-y-1 text-sm text-muted">
          <p>{formatDateRange(event.start_date, event.end_date)}</p>
          {event.club?.name && <p>{event.club.name}</p>}
        </div>

        <div className="pt-2">
          {isOpen ? (
            <Link href={`/register/${event.slug}`} className="block">
              <Button className="w-full">Inscribirme</Button>
            </Link>
          ) : (
            <Link href={`/event/${event.slug}`} className="block">
              <Button variant="outline" className="w-full">
                Ver resultados
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
