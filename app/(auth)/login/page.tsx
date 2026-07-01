import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/app/(auth)/actions";

export default function LoginPage() {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Ingresar</h1>
          <p className="text-sm text-muted">
            Para jugadores y administradores de club.
          </p>
        </div>

        <AuthForm action={loginAction} mode="login" />

        <p className="text-center text-sm text-muted">
          ¿No tenés cuenta?{" "}
          <Link
            href="/register-account"
            className="font-semibold text-padel-600"
          >
            Crear cuenta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
