import { Card, CardContent } from "@/components/ui/card";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Nueva contraseña</h1>
          <p className="text-sm text-muted">
            Elegí una contraseña nueva para tu cuenta.
          </p>
        </div>
        <ResetForm />
      </CardContent>
    </Card>
  );
}
