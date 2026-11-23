import type { NextConfig } from "next";

/**
 * Demo build (NEXT_PUBLIC_YOURIP_DEMO=true): a fully static export of the interface.
 *  - `output: "export"` produces plain HTML/JS/CSS; there is no server runtime to run anything.
 *  - `pageExtensions: ["tsx", "jsx", "js"]` makes Next ignore every `route.ts` file, so the API route handlers that
 *    forward to the local converter (and call YouTube's oEmbed endpoint) are not compiled at all.
 * The normal build is unchanged.
 */
const demo = process.env.NEXT_PUBLIC_YOURIP_DEMO === "true";

// Pin the flag to an explicit "true"/"false" in both modes. An unset variable is not folded by the bundler, which
// would leave the demo-only code in the normal bundle (inert, but not wanted there).
const flag = { NEXT_PUBLIC_YOURIP_DEMO: demo ? "true" : "false" };

const nextConfig: NextConfig = demo
  ? { devIndicators: false, env: flag, output: "export", pageExtensions: ["tsx", "jsx", "js"], images: { unoptimized: true } }
  : { devIndicators: false, env: flag };
export default nextConfig;
