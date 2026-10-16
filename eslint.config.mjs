import next from "eslint-config-next";

const cfg = [...next, { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] }];
export default cfg;
