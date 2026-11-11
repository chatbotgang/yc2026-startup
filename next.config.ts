import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Cloud Run container image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // /display serves the presentation deck in public/deck (synced with `pnpm deck:sync`).
  rewrites() {
    return [
      // The presentation deck is the home page (and still at /display); payments live at /pay.
      { source: "/", destination: "/deck/index.html" },
      { source: "/display", destination: "/deck/index.html" },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
