"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requestOperateClub } from "@/app/admin/operar/actions";

export interface OperarClub {
  id: string;
  name: string;
  city: string | null;
  status: string | null; // null | 'pending' | 'rejected' (accepted ya no aparece)
}

export function OperarManager({ clubs }: { clubs: OperarClub[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const request = (id: string) => {
    setError(null);
    setBusy(id);
    start(async () => {
      const r = await requestOperateClub(id);
      setBusy(null);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  if (clubs.length === 0) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface px-4 py-10 text-center text-sm text-muted">
        No hay otros clubes disponibles para operar por ahora.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
      {clubs.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{c.name}</p>
            <p className="text-xs text-muted">{c.city ?? "—"}</p>
          </div>
          {c.status === "pending" ? (
            <Badge tone="neutral">Solicitud enviada · esperando aprobación</Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={c.status === "rejected" ? "outline" : "primary"}
              disabled={pending && busy === c.id}
              onClick={() => request(c.id)}
            >
              {pending && busy === c.id
                ? "Enviando…"
                : c.status === "rejected"
                  ? "Rechazada · volver a solicitar"
                  : "Solicitar operar"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
