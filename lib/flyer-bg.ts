/**
 * Carga una imagen de fondo para los flyers desde el bucket público `flyer-bg`.
 * Devuelve un data URI (para embeber en next/og) o null si no existe.
 * Nombres esperados en el bucket: torneos.jpg, ranking.jpg, pago.jpg.
 */
export async function flyerBg(name: string): Promise<string | null> {
  try {
    const url = `https://ruppicqugjpnosuxyaoi.supabase.co/storage/v1/object/public/flyer-bg/${name}.jpg`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}
