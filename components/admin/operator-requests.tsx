"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { decideOperatorRequest } from "@/app/admin/operar/actions";

export interface OperatorReq {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export function OperatorRequests({ requests }: { requests: OperatorReq[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const decide = (id: string, accept: boolean) => {
    setError(null);
    start(async () => {
      const r = await decideOperatorRequest(id, accept);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
      <h2 className="text-sm font-bold text-ink">
        Solicitudes de operadores ({requests.length})
      </h2>
      <p className="mb-3 text-xs text-muted">
        Comerciales que piden gestionar las canchas y torneos de tu club. Al
        aprobar pueden operar tu club (agenda, turnos, torneos y jugadores), pero
        NO ven finanzas, miembros ni tu configuración de Mercado Pago.
      </p>
      {error && <p className="mb-2 text-sm font-semibold text-red-500">{error}</p>}
      <div className="space-y-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">{r.name}</p>
              <p className="text-xs text-muted">{r.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={pending} onClick={() => decide(r.id, true)}>
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => decide(r.id, false)}
              >
                Rechazar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
