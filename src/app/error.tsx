"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid place-items-center py-32 text-center">
      <p className="eyebrow mb-3">Something broke</p>
      <h1 className="display text-4xl">We could not load this page</h1>
      <p className="mt-3 text-fog">The data source may be down. Cached data will return on its own.</p>
      <button onClick={reset} className="mt-6 rounded-full border border-gold px-5 py-2 text-gold hover:bg-gold/10">Try again</button>
    </div>
  );
}
