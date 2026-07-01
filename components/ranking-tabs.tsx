"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

const TABS = [
  { value: "players", label: "Jugadores" },
  { value: "clubs", label: "Clubes" },
];

export function RankingTabs({
  players,
  clubs,
}: {
  players: ReactNode;
  clubs: ReactNode;
}) {
  const [tab, setTab] = useState("players");

  return (
    <div className="space-y-6">
      <Tabs tabs={TABS} value={tab} onValueChange={setTab} />
      {tab === "players" ? players : clubs}
    </div>
  );
}
