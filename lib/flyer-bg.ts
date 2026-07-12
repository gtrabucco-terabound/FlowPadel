/**
 * URL pública del fondo del flyer (bucket `flyer-bg`). Se pasa directo al <img>
 * de next/og (que la descarga al renderizar). Debe ser JPEG o PNG real (Satori
 * no soporta AVIF/WebP). Nombres: torneos.jpg, ranking.jpg, pago.jpg.
 */
export function flyerBg(name: string): string {
  return `https://ruppicqugjpnosuxyaoi.supabase.co/storage/v1/object/public/flyer-bg/${name}.jpg`;
}
