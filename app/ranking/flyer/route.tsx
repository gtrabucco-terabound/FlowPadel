import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("full_name, elo_rating, club:clubs(name)")
    .gt("matches_played", 0)
    .order("elo_rating", { ascending: false })
    .limit(10);

  const players = (data ?? []) as unknown as Array<{
    full_name: string;
    elo_rating: number;
    club: { name: string | null } | null;
  }>;

  const LIME = "#C7F94B";
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

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
    ),
    { width: 1200, height: 630 }
  );
}
