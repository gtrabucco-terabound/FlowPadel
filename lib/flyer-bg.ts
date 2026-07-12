import { readFile } from "fs/promises";
import path from "path";

/**
 * Fondo del flyer leído del disco (public/flyers/<name>.jpg) y devuelto como
 * data URI para embeberlo en next/og. No depende de descargar nada por red
 * (Satori a veces no puede fetch imágenes remotas en el runtime de Vercel).
 * Debe ser JPEG o PNG real. Nombres: torneos, ranking, pago.
 */
export async function flyerBg(name: string): Promise<string | null> {
  try {
    const file = path.join(process.cwd(), "public", "flyers", `${name}.jpg`);
    const buf = await readFile(file);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
