"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { addMember, changeRole, removeMember } from "@/app/admin/miembros/actions";
import type { Enums } from "@/lib/database.types";

type Role = Enums<"club_member_role">;

export interface MemberRow {
  profile_id: string;
  email: string;
  full_name: string;
  role: Role;
}

const ROLE_LABEL: Record<Role, string> = {
  club_admin: "Administrador",
  staff: "Staff",
  operator: "Operador (comercial)",
};

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-padel-500 disabled:opacity-50";

export function MembersManager({
  members,
  currentUserId,
}: {
  members: MemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [addError, setAddError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("role", role);
    startTransition(async () => {
      const res = await addMember(fd);
      if (res.ok) {
        setEmail("");
        setRole("staff");
        router.refresh();
      } else {
        setAddError(res.error);
      }
    });
  }

  function handleChangeRole(profileId: string, next: Role) {
    setRowError(null);
    startTransition(async () => {
      const res = await changeRole(profileId, next);
      if (res.ok) router.refresh();
      else setRowError(res.error);
    });
  }

  function handleRemove(profileId: string) {
    setRowError(null);
    startTransition(async () => {
      const res = await removeMember(profileId);
      if (res.ok) router.refresh();
      else setRowError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Agregar miembro */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Agregar miembro</h2>
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="persona@email.com"
                disabled={isPending}
                className={inputClass}
              />
            </div>
            <div className="sm:w-44">
              <label className="mb-1 block text-xs font-medium text-muted">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={isPending}
                className={inputClass}
              >
                <option value="club_admin">Administrador</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              Agregar
            </Button>
          </form>
          {addError && <p className="text-sm text-danger">{addError}</p>}
        </CardContent>
      </Card>

      {rowError && <p className="text-sm text-danger">{rowError}</p>}

      {/* Lista de miembros */}
      <div className="space-y-2">
        {members.map((m) => {
          const isSelf = m.profile_id === currentUserId;
          return (
            <Card key={m.profile_id}>
              <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <Avatar name={m.full_name || m.email} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {m.full_name || m.email}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-muted">
                        vos
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{m.email}</p>
                </div>
                <Badge tone={m.role === "club_admin" ? "neutral" : "closed"}>
                  {ROLE_LABEL[m.role]}
                </Badge>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      handleChangeRole(m.profile_id, e.target.value as Role)
                    }
                    disabled={isPending || isSelf}
                    className="rounded-lg border border-black/10 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-padel-500 disabled:opacity-50"
                  >
                    <option value="club_admin">Administrador</option>
                    <option value="staff">Staff</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending || isSelf}
                    onClick={() => handleRemove(m.profile_id)}
                  >
                    Quitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
