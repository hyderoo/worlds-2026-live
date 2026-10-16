import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchesView } from "@/components/matches-view";
import { PageTitle, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Match center", description: "Live, upcoming and completed Worlds 2026 matches with filters, search and calendar view.", alternates: { canonical: "/matches" } };

export default function Page() {
  return (
    <>
      <PageTitle eyebrow="Match center" title="Every series, one place" sub="Filters live in the URL, so any view can be shared." />
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}><MatchesView /></Suspense>
    </>
  );
}
