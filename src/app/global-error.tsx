"use client";
import { useEffect } from "react";
import { reloadOnceIfStale, reportClientError } from "@/lib/client-error";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (reloadOnceIfStale(error)) return;
    reportClientError(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ background: "#0d0c11", color: "#f1eef9", fontFamily: "sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", textAlign: "center", padding: 24 }}>
        <div>
          <h1>Worlds 2026 Live could not load</h1>
          <p>The source may be briefly unavailable, or this is an old copy of the page. Reload to try again.</p>
          <button onClick={() => location.reload()} style={{ padding: "8px 20px", borderRadius: 999, border: "1px solid #d9b86c", color: "#d9b86c", background: "transparent" }}>Reload</button>
          <p style={{ fontSize: 12, opacity: 0.7 }}>{error.name}: {error.message}{error.digest ? ` (digest ${error.digest})` : ""}</p>
        </div>
      </body>
    </html>
  );
}
