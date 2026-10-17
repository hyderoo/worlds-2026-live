"use client";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Snapshot } from "@/lib/types";

type Ctx = { snap: Snapshot; offline: boolean; refreshing: boolean };
const SnapCtx = createContext<Ctx | null>(null);

async function fetchSnapshot(): Promise<Snapshot> {
  const res = await fetch("/api/public/snapshot", { cache: "no-store" });
  if (!res.ok) throw new Error(`snapshot ${res.status}`);
  if (res.headers.get("x-w26-offline")) throw new Error("served from offline cache");
  return res.json();
}

function SnapshotProvider({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["snapshot"],
    queryFn: fetchSnapshot,
    initialData: initial,
    staleTime: 10_000,
    retry: 2,
    // poll faster only while a match is verified live; this is the fallback path when Realtime is not configured
    refetchInterval: (query) => (query.state.data?.matches.some((m) => m.state === "live") ? 20_000 : 90_000),
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    let cleanup = () => {};
    let cancelled = false;
    void import("@supabase/supabase-js").then(({ createClient }) => {
      if (cancelled) return;
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const ch = sb
        .channel("matches-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => void qc.invalidateQueries({ queryKey: ["snapshot"] }))
        .subscribe();
      cleanup = () => void sb.removeChannel(ch);
    });
    return () => { cancelled = true; cleanup(); };
  }, [qc]);

  return <SnapCtx.Provider value={{ snap: q.data ?? initial, offline: q.isError, refreshing: q.isFetching }}>{children}</SnapCtx.Provider>;
}

export function Providers({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  return (
    <QueryClientProvider client={client}>
      <SnapshotProvider initial={initial}>{children}</SnapshotProvider>
    </QueryClientProvider>
  );
}

export function useSnapshot(): Ctx {
  const c = useContext(SnapCtx);
  if (!c) throw new Error("useSnapshot outside provider");
  return c;
}
