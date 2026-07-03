import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/app/(auth)/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Ingresar</h1>
          <p className="text-sm text-muted">
            Para jugadores y administradores de club.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <AuthForm action={loginAction} mode="login" />

        <div className="space-y-1 text-center text-sm text-muted">
          <p>
            <Link href="/recuperar" className="font-semibold text-padel-600">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
          <p>
            ¿No tenés cuenta?{" "}
            <Link
              href="/register-account"
              className="font-semibold text-padel-600"
            >
              Crear cuenta
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
