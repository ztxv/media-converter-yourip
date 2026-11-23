import type { ConverterApi } from "@/lib/converter-api";

/*
 * Resolved at build time. The bundler replaces `process.env.NEXT_PUBLIC_YOURIP_DEMO` with a literal and drops
 * the branch that is not taken, including the module it requires: the demo bundle contains no real fetch
 * paths, and the normal bundle contains no simulator. The literal must stay written out here (an imported
 * constant is not folded across modules), and these must stay `require` calls (static imports pull in both).
 * scripts/verify-demo-build.mjs fails the demo build if either property regresses.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const api: ConverterApi = process.env.NEXT_PUBLIC_YOURIP_DEMO === "true"
  ? require("@/lib/converter-api.demo").demoApi
  : require("@/lib/converter-api.live").liveApi;
/* eslint-enable @typescript-eslint/no-require-imports */
