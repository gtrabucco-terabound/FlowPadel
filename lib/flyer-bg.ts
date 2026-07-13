/**
 * URL (mismo origen, servida por Vercel desde /public/flyers) del fondo del
 * flyer. Se pasa directo al <img> de next/og. Satori descarga y decodifica
 * JPEG por URL (no soporta JPEG como data URI, ni AVIF/WebP).
 * Archivos: public/flyers/{torneos,ranking,pago}.jpg
 */
export function flyerBg(name: string): string {
  return `https://flow-padel.vercel.app/flyers/${name}.jpg`;
}
