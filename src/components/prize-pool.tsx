import type { PrizePool } from "@/lib/types";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const label = (p: string) => (p.includes("-") ? `${p}th` : p === "1" ? "1st" : p === "2" ? "2nd" : p === "3" ? "3rd" : `${p}th`);

export function PrizePoolCard({ prize }: { prize: PrizePool | null }) {
  return (
    <section className="card mt-6 p-6" aria-labelledby="prize-h">
      <p className="eyebrow mb-1">Prize pool</p>
      {!prize ? (
        <>
          <h2 id="prize-h" className="display text-2xl">Not read yet</h2>
          <p className="mt-2 text-sm text-fog">The official Riot feed does not include the prize pool. The unofficial source (Liquipedia) has not been read yet, so no figure is shown.</p>
        </>
      ) : (
        <>
          <h2 id="prize-h" className="display text-4xl text-gold sm:text-5xl">{usd(prize.totalUsd)}</h2>
          {prize.slots.length > 0 && (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {prize.slots.map((s) => (
                <li key={s.place} className="rounded-xl border border-line px-3 py-2">
                  <p className="text-xs uppercase tracking-wider text-fog">{label(s.place)} · {s.percentage}%</p>
                  <p className="display text-xl tabular-nums">{usd(s.usd)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-fog">Unofficial: total and percentages per placement as listed on <a className="underline" href={prize.page} target="_blank" rel="noreferrer">Liquipedia</a> (CC-BY-SA 3.0), read {new Date(prize.fetchedAt).toLocaleString()}. Percentages apply per team in the placement range; dollar amounts are calculated from them. Not an official Riot announcement.</p>
        </>
      )}
    </section>
  );
}
