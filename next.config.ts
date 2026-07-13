import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Incluir los fondos de los flyers en las funciones serverless (los lee del
  // disco flyer-bg → data URI; sin esto Next no los empaqueta y no los encuentra).
  outputFileTracingIncludes: {
    "/torneos/flyer": ["./public/flyers/**"],
    "/ranking/flyer": ["./public/flyers/**"],
    "/pagar/[id]/opengraph-image": ["./public/flyers/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ruppicqugjpnosuxyaoi.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
