import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { signupAction } from "@/app/(auth)/actions";

export default function RegisterAccountPage() {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Crear cuenta</h1>
          <p className="text-sm text-muted">
            Registrate como jugador para seguir tu ranking.
          </p>
        </div>

        <AuthForm action={signupAction} mode="signup" />

        <p className="text-center text-sm text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-padel-600">
            Ingresar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
