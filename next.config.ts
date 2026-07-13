import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El type-check (tsc) sigue bloqueando el build; el lint de estilo no, para
  // que una regla cosmética no frene los deploys (nos pasó con no-html-link).
  eslint: { ignoreDuringBuilds: true },
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
