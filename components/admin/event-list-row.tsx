"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/app/admin/events/actions";

type Tone = "draft" | "open" | "live" | "closed" | "neutral";

export function EventListRow({
  id,
  name,
  subtitle,
  statusLabel,
  statusTone,
  isDraft,
}: {
  id: string;
  name: string;
  subtitle: string;
  statusLabel: string;
  statusTone: Tone;
  isDraft: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const onDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`¿Borrar "${name}"? Esta acción no se puede deshacer.`)) return;
    start(async () => {
      setErr(null);
      const r = await deleteEvent(id);
      if (!r.ok) setErr(r.error);
      else router.refresh();
    });
  };

  return (
    <Card className="transition-colors hover:border-padel-200">
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <Link href={`/admin/events/${id}`} className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{name}</p>
          <p className="text-xs text-muted">{subtitle}</p>
          {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          {isDraft && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={onDelete}
              className="text-red-500 hover:text-red-600"
            >
              {pending ? "…" : "Borrar"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
