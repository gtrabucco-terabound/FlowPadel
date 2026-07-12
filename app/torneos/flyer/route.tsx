import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CAT = ["", "1ra", "2da", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"];
function prettyDate(d: string | null): string {
  if (!d) return "A definir";
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("name, start_date, category_value, modality, club:clubs!events_club_id_fkey(name)")
    .eq("public_visible", true)
    .eq("status", "open")
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(6);

  const events = (data ?? []) as unknown as Array<{
    name: string;
    start_date: string | null;
    category_value: string | null;
    modality: string | null;
    club: { name: string | null } | null;
  }>;

  const LIME = "#C7F94B";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0E1512",
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
          <span style={{ color: "#F3F6F2" }}>Flow</span>
          <span style={{ color: LIME }}>Padel</span>
        </div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#F3F6F2", marginBottom: 18 }}>
          🏆 Torneos disponibles
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
          {events.length === 0 ? (
            <div style={{ display: "flex", fontSize: 30, color: "#9BA69F" }}>
              Pronto abrimos nuevos torneos. ¡Seguinos!
            </div>
          ) : (
            events.map((e, i) => {
              const cat = e.category_value ? CAT[Number(e.category_value)] || e.category_value : "";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#161D1A",
                    border: "1px solid #26302B",
                    borderRadius: 14,
                    padding: "14px 22px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#F3F6F2" }}>
                      {e.name}
                    </div>
                    <div style={{ display: "flex", fontSize: 22, color: "#9BA69F" }}>
                      {[cat, e.club?.name].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: LIME,
                      color: "#11201B",
                      fontSize: 24,
                      fontWeight: 700,
                      padding: "6px 16px",
                      borderRadius: 20,
                    }}
                  >
                    {prettyDate(e.start_date)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", fontSize: 26, color: LIME, marginTop: 14 }}>
          👉 Inscribite en la app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
