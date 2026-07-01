import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold text-ink">Página no encontrada</h1>
      <p className="mt-2 text-muted">
        El evento o la página que buscás no existe o no está disponible.
      </p>
      <Link href="/" className="mt-6">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
