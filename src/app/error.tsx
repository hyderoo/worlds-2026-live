"use client";
import { useEffect, useState } from "react";
import { reloadOnceIfStale, reportClientError } from "@/lib/client-error";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const off = !navigator.onLine;
    const tm = setTimeout(() => setOffline(off), 0);
    const on = () => location.reload();
    window.addEventListener("online", on);
    if (!off) {
      console.error(error);
      if (!reloadOnceIfStale(error)) reportClientError(error);
    }
    return () => { clearTimeout(tm); window.removeEventListener("online", on); };
  }, [error]);
  if (offline) {
    return (
      <div className="grid place-items-center py-32 text-center">
        <p className="eyebrow mb-3">Offline</p>
        <h1 className="display text-4xl">You are offline</h1>
        <p className="mt-3 max-w-md text-fog">This part of the app was not saved on your device yet. Pages you opened before still load from your last saved copy, and nothing is live while you are offline. It reloads when the connection returns.</p>
        <div className="mt-6 flex gap-3">
          <a href="/today" className="rounded-full border border-gold px-5 py-2 text-gold hover:bg-gold/10">Today</a>
          <a href="/matches" className="rounded-full border border-line px-5 py-2 text-fog hover:text-snow">Matches</a>
        </div>
      </div>
    );
  }
  return (
    <div className="grid place-items-center py-32 text-center">
      <p className="eyebrow mb-3">Something broke</p>
      <h1 className="display text-4xl">We could not load this page</h1>
      <p className="mt-3 text-fog">This is often an old copy of the page after an update. Reloading usually fixes it.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => location.reload()} className="rounded-full border border-gold px-5 py-2 text-gold hover:bg-gold/10">Reload</button>
        <button onClick={reset} className="rounded-full border border-line px-5 py-2 text-fog hover:text-snow">Try again</button>
      </div>
      <details className="mt-6 max-w-md text-xs text-fog"><summary className="cursor-pointer">Technical details</summary><p className="mt-2 break-words">{error.name}: {error.message}{error.digest ? ` (digest ${error.digest})` : ""}</p></details>
    </div>
  );
}
