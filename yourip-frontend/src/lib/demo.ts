/**
 * Build-time switch for the hosted, simulated demo. Only set it through `npm run build:demo` /
 * `npm run dev:demo` (scripts/demo.mjs).
 *
 * IMPORTANT: code that must disappear from one of the two bundles (page.tsx, converter-api.select.ts) writes
 * `process.env.NEXT_PUBLIC_YOURIP_DEMO === "true"` out in full, because the bundler only folds that literal
 * inside the module that contains it, not through this exported constant. Use IS_DEMO only for values that
 * do not decide what gets bundled.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_YOURIP_DEMO === "true";

export const REPO_URL = "https://github.com/ztxv/media-converter-yourip";
export const QUICK_START_URL = `${REPO_URL}#quick-start`;
