"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { acceptInterclubChallenge } from "@/app/admin/events/actions";

export interface InterclubChallenge {
  id: string;
  name: string;
  startDate: string | null;
  organizerName: string;
}

export function InterclubChallenges({
  challenges,
}: {
  challenges: InterclubChallenge[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accept = (eventId: string) => {
    setError(null);
    start(async () => {
      const res = await acceptInterclubChallenge(eventId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-ink">
            Desafíos interclub recibidos
          </h2>
          <Badge tone="live">{challenges.length}</Badge>
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <div className="space-y-2">
          {challenges.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface px-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{c.name}</p>
                <p className="text-xs text-muted">
                  Organiza: {c.organizerName} · {formatDate(c.startDate)}
                </p>
              </div>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => accept(c.id)}
              >
                Aceptar desafío
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
