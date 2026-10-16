import { createMemoryStore } from "../src/lib/store";
import { runSync } from "../src/lib/sync";
const s = createMemoryStore();
const r = await runSync(s, "manual-check");
console.log(r.ok, r.matchesSeen, r.matchesChanged, r.error);
const st = await s.loadGameStats();
for (const [id, g] of Object.entries(st)) console.log(id, g.map((x) => `${x.n}:${x.blue.team}/${x.red.team}:${x.blue.picks[0]?.[1]}`).join(" "));
const ms = await s.loadMatches();
console.log(ms.filter((m) => m.games.length).map((m) => `${m.teams[0].code}-${m.teams[1].code} games=${m.games.length} vods=${m.games[0]?.vods.length}`));
