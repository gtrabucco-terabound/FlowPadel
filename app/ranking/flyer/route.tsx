import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { flyerBg } from "@/lib/flyer-bg";
import { listTopPlayersWithClub } from "@/modules/ranking/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const players = await listTopPlayersWithClub(supabase, 10);

  const LIME = "#C7F94B";
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);
  const bg = await flyerBg("ranking");

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
          padding: 56,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
          <span style={{ color: "#F3F6F2" }}>Flow</span>
          <span style={{ color: LIME }}>Padel</span>
        </div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#F3F6F2", marginBottom: 18 }}>
          🏅 Ranking · Top 10
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
          {players.length === 0 ? (
            <div style={{ display: "flex", fontSize: 30, color: "#9BA69F" }}>
              El ranking se arma con los primeros partidos. ¡Pronto!
            </div>
          ) : (
            players.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: i < 3 ? "#1B241F" : "#161D1A",
                  border: "1px solid #26302B",
                  borderRadius: 12,
                  padding: "8px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ display: "flex", width: 44, fontSize: 28, fontWeight: 800, color: "#F3F6F2" }}>
                    {medal(i)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#F3F6F2" }}>
                      {p.full_name}
                    </div>
                    <div style={{ display: "flex", fontSize: 18, color: "#9BA69F" }}>
                      {p.club?.name ?? ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: LIME }}>
                  {Math.round(p.elo_rating)}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", fontSize: 26, color: LIME, marginTop: 14 }}>
          👉 Ranking completo en la app
        </div>
      </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
