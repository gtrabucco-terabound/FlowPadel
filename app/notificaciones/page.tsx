import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listRecentNotifications } from "@/modules/notifications/repository";
import { markAllNotificationsRead } from "./actions";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const notifications = await listRecentNotifications(supabase);
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notificaciones</h1>
          <p className="mt-1 text-sm text-muted">
            Avisos de torneos y novedades para vos.
          </p>
        </div>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              Marcar todo leído
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted">
            Todavía no tenés notificaciones. Cuando se abra un torneo para vos,
            te avisamos acá.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const inner = (
              <div
                className={`flex gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  n.read_at
                    ? "border-border-soft bg-canvas"
                    : "border-accent/40 bg-surface"
                }`}
              >
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-faint">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
            );
            return n.url ? (
              <Link key={n.id} href={n.url} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
