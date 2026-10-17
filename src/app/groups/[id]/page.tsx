import type { Metadata } from "next";
import { GroupView } from "@/components/groups-view";

export const metadata: Metadata = { title: "Friends league", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupView id={id} />;
}
