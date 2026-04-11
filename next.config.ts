import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Prevent native-binding packages from being bundled into Edge functions.
  // argon2 uses node-gyp-build(__dirname) at module load time — invalid in Edge runtime.
  serverExternalPackages: ["argon2", "postgres"],
};

export default nextConfig;
