import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本系統每次都即時讀取本機 JSON，不需要 Cache Components / Partial Prerendering
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
