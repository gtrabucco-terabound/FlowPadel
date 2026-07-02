import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function VerificaEmailPage() {
  return (
    <Card>
      <CardContent className="space-y-4 text-center">
        <div className="text-4xl">📬</div>
        <div>
          <h1 className="text-xl font-bold text-ink">Revisá tu email</h1>
          <p className="mt-1 text-sm text-muted">
            Te enviamos un correo para confirmar tu cuenta. Abrí el link del
            mail y listo — después vas a poder ingresar.
          </p>
        </div>
        <p className="text-xs text-faint">
          ¿No lo ves? Revisá la carpeta de spam o promociones. Puede tardar un
          par de minutos.
        </p>
        <p className="text-center text-sm text-muted">
          Ya lo confirmé →{" "}
          <Link href="/login" className="font-semibold text-padel-600">
            Ingresar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
