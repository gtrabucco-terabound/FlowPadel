"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/app/(auth)/actions";

/** Menú desplegable para pantallas chicas (evita que el header se desborde). */
export function MobileMenu({
  user,
  isAdmin,
  name = "",
}: {
  user: boolean;
  isAdmin: boolean;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const linkCls =
    "block rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-2";

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Menú"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-soft text-ink"
      >
        <span aria-hidden className="text-lg leading-none">{open ? "✕" : "☰"}</span>
      </button>

      {open && (
        <>
          {/* Fondo para cerrar al tocar afuera */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default bg-black/20"
          />
          <div className="absolute right-4 top-16 z-50 w-56 overflow-hidden rounded-2xl border border-border-soft bg-canvas p-2 shadow-xl">
            {user && name && (
              <div className="border-b border-border-soft px-3 pb-2 pt-1 text-sm font-semibold text-ink">
                Hola, {name}
              </div>
            )}
            <Link href="/torneos" onClick={close} className={linkCls}>
              Torneos
            </Link>
            <Link href="/ranking" onClick={close} className={linkCls}>
              Ranking
            </Link>
            {isAdmin && (
              <Link href="/admin" onClick={close} className={linkCls}>
                Panel del club
              </Link>
            )}
            {user ? (
              <Link href="/perfil" onClick={close} className={linkCls}>
                Mi perfil
              </Link>
            ) : (
              <Link href="/login" onClick={close} className={linkCls}>
                Ingresar
              </Link>
            )}

            <div className="my-1 border-t border-border-soft" />
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs text-muted">Tema</span>
              <ThemeToggle />
            </div>

            {user && (
              <form action={logoutAction} className="mt-1">
                <Button type="submit" variant="ghost" size="sm" className="w-full">
                  Salir
                </Button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
