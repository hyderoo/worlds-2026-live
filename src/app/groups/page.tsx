import type { Metadata } from "next";
import { GroupsHome } from "@/components/groups-view";

export const metadata: Metadata = { title: "Friends league", description: "Pick match winners with friends and compare on a shared leaderboard. Opt-in, no login.", alternates: { canonical: "/groups" } };

export default function Page() {
  return <GroupsHome />;
}
