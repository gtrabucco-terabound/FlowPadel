import { Card, CardContent } from "@/components/ui/card";
import { RecoverForm } from "./recover-form";

export default function RecuperarPage() {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Recuperar contraseña</h1>
          <p className="text-sm text-muted">
            Ingresá tu email y te mandamos un enlace para elegir una nueva.
          </p>
        </div>
        <RecoverForm />
      </CardContent>
    </Card>
  );
}
