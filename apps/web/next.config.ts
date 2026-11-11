import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@interlink/types",
    "@interlink/validation",
    "@interlink/utils",
  ],
};

export default nextConfig;
