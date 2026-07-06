import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { formatModalityCategory, formatDateRange } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "Flyer del torneo — FlowPadel";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select(
      "name, modality, category_system, category_value, start_date, end_date, venue, flyer_image_url, inscription_per_person, club:clubs!events_club_id_fkey(name, logo_url)"
    )
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();

  const name = ev?.name ?? "Torneo";
  const club = (ev as { club?: { name: string | null; logo_url: string | null } | null } | null)?.club;
  const meta = ev ? formatModalityCategory(ev) : null;
  const dates = ev ? formatDateRange(ev.start_date, ev.end_date) : "";
  const price = Number(ev?.inscription_per_person ?? 0);
  const bg = ev?.flyer_image_url ?? null;

  const LIME = "#C7F94B";
  const INK = "#11201B";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0E1512",
          fontFamily: "sans-serif",
        }}
      >
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            backgroundColor: bg ? "rgba(8,12,10,0.66)" : "rgba(8,12,10,0.30)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: "#F3F6F2" }}>Flow</span>
            <span style={{ color: LIME }}>Padel</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {meta ? (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  backgroundColor: LIME,
                  color: INK,
                  fontSize: 26,
                  fontWeight: 700,
                  padding: "6px 20px",
                  borderRadius: 30,
                  marginBottom: 18,
                }}
              >
                {meta}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontSize: 76,
                fontWeight: 800,
                color: "#F3F6F2",
                lineHeight: 1.02,
                letterSpacing: -2,
                maxWidth: 1000,
              }}
            >
              {name}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", color: "#D8DED8", fontSize: 28 }}>
              {dates ? <div style={{ display: "flex" }}>{dates}</div> : null}
              <div style={{ display: "flex", color: "#9BA69F", fontSize: 24 }}>
                {ev?.venue ?? club?.name ?? ""}
              </div>
            </div>
            {price > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", color: "#9BA69F", fontSize: 20 }}>Inscripción</div>
                <div style={{ display: "flex", color: LIME, fontSize: 40, fontWeight: 800 }}>
                  ${price.toLocaleString("es-AR")}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
