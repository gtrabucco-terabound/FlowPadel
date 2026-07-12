/**
 * Devuelve la URL pública del fondo del flyer (bucket `flyer-bg`) si existe,
 * o null si no. La URL se pasa directo al <img> de next/og (que la descarga).
 * Nombres esperados: torneos.jpg, ranking.jpg, pago.jpg.
 */
export async function flyerBg(name: string): Promise<string | null> {
  const url = `https://ruppicqugjpnosuxyaoi.supabase.co/storage/v1/object/public/flyer-bg/${name}.jpg`;
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}
