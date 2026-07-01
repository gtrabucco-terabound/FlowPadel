"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EventCard, type EventCardData } from "@/components/event-card";

export function EventsGridRealtime({
  initialEvents,
}: {
  initialEvents: EventCardData[];
}) {
  const router = useRouter();
  const [events] = useState(initialEvents);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("public:events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          // Re-fetch the Server Component data when public events change.
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/10 bg-surface p-10 text-center text-muted">
        No hay eventos publicados por ahora. Volvé pronto.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
