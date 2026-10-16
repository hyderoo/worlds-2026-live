import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Data and sync", description: "Where Worlds 2026 Live gets its data, how it stays fresh, and what is never shown.", alternates: { canonical: "/about" } };
export default function Page() {
  return (
    <>
      <PageTitle eyebrow="Transparency" title="Data and sync" />
      <div className="card mt-6 grid max-w-3xl gap-4 p-6 leading-relaxed text-fog">
        <p><strong className="text-snow">Source.</strong> Matches, schedule, scores and VOD links come from the LoL Esports service that powers lolesports.com. It is the same data the official site shows.</p>
        <p><strong className="text-snow">Freshness.</strong> A scheduled job pulls the source every few minutes, writes changes idempotently to the shared database, and the site updates through realtime events or short polling. The badge in the header shows the last successful sync and any error.</p>
        <p><strong className="text-snow">Failures.</strong> If the source is down, the last good data stays on screen and the badge says so.</p>
        <p><strong className="text-snow">Never shown.</strong> No invented scores, no predicted brackets, no MVP unless a source provides it. A match the source calls live before its scheduled time is marked unverified.</p>
        <p><strong className="text-snow">Unofficial data.</strong> If a secondary source such as Liquipedia is ever used to fill a gap, the value is labeled unofficial, credited (CC-BY-SA 3.0) and never overrides official data.</p>
        <p><strong className="text-snow">Instinct mirror.</strong> A read-only recap page hosted on Instinct reads the same data from this app&apos;s public API.</p>
        <p>This is a fan project, not affiliated with Riot Games.</p>
      </div>
    </>
  );
}
