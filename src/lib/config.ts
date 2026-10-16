/**
 * The key below is the public web key that lolesports.com itself ships to every browser.
 * It is not a secret. Override with LOLESPORTS_API_KEY if Riot rotates it.
 */
const PUBLIC_WEB_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";

export const config = {
  apiBase: "https://esports-api.lolesports.com/persisted/gw",
  feedBase: "https://feed.lolesports.com/livestats/v1",
  apiKey: process.env.LOLESPORTS_API_KEY || PUBLIC_WEB_KEY,
  leagueId: process.env.LOLESPORTS_LEAGUE_ID || "98767975604431411",
  tournamentId: process.env.LOLESPORTS_TOURNAMENT_ID || "115660540725177488",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  corsOrigins: (process.env.CORS_ALLOW_ORIGINS || "https://files.instinct.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  /** In cache-only mode, how long an upstream fetch is reused. */
  cacheTtlMs: 30_000,
};

export const hasSupabase = () => Boolean(config.supabaseUrl && config.supabaseServiceKey);
