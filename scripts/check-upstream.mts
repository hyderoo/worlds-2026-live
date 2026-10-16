import { fetchUpstream } from "../src/lib/upstream";
const r = await fetchUpstream();
console.log(r.matches.length, r.stages, r.attempts);
for (const m of r.matches.slice(0, 8)) console.log(m.id, m.startTime, m.stage, m.block, m.state, m.upstreamState, m.teams.map((t) => `${t.code}:${t.wins}`).join(" v "), m.previous.length);
console.log(r.matches.filter((m) => m.stage === "Knockouts").map((m) => `${m.block}|${m.startTime}|${m.previous.length}`));
