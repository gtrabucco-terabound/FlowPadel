"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveClub } from "@/app/admin/actions";
import type { AdminMembership } from "@/lib/admin/club";

export function ClubSwitcher({
  memberships,
  activeClubId,
}: {
  memberships: AdminMembership[];
  activeClubId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (memberships.length <= 1) {
    return (
      <span className="text-sm font-bold text-ink">
        {memberships[0]?.club.name}
      </span>
    );
  }

  return (
    <select
      aria-label="Club activo"
      value={activeClubId}
      disabled={pending}
      onChange={(e) => {
        const id = e.target.value;
        startTransition(async () => {
          await setActiveClub(id);
          router.refresh();
        });
      }}
      className="rounded-lg border border-black/10 bg-surface px-3 py-1.5 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-padel-500"
    >
      {memberships.map((m) => (
        <option key={m.club.id} value={m.club.id}>
          {m.club.name}
        </option>
      ))}
    </select>
  );
}
