import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { flyerBg } from "@/lib/flyer-bg";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "Pagá tu turno — FlowPadel";

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_booking_payinfo", { p_id: id });
  const info = (data ?? null) as {
    amount: number | null;
    date: string;
    start: number;
    club: string;
    court: string | null;
    court_number: number | null;
  } | null;

  const LIME = "#C7F94B";
  const court = info
    ? `${info.court_number ? `#${info.court_number} ` : ""}${info.court ?? "Cancha"}`
    : "Cancha";
  const bg = await flyerBg("pago");

  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", backgroundColor: "#0E1512", fontFamily: "sans-serif" }}>
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
        ) : null}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", background: "linear-gradient(90deg, rgba(8,12,10,0.80), rgba(8,12,10,0.40))" }} />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
          <span style={{ color: "#F3F6F2" }}>Flow</span>
          <span style={{ color: LIME }}>Padel</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: LIME,
              color: "#11201B",
              fontSize: 26,
              fontWeight: 700,
              padding: "6px 20px",
              borderRadius: 30,
              marginBottom: 18,
            }}
          >
            💳 Pagá tu turno
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#F3F6F2", letterSpacing: -1 }}>
            {info?.club ?? "Reservá tu cancha"}
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 32, color: "#9BA69F" }}>
            {info ? `${court} · ${info.date} · ${hhmm(info.start)}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#9BA69F" }}>
            Tocá para pagar con Mercado Pago
          </div>
          {info?.amount ? (
            <div style={{ display: "flex", color: LIME, fontSize: 52, fontWeight: 800 }}>
              ${Number(info.amount).toLocaleString("es-AR")}
            </div>
          ) : null}
        </div>
      </div>
      </div>
    ),
    { ...size }
  );
}
