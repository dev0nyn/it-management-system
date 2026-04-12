import type { NextConfig } from "next";

// CORS_ORIGIN: set on Railway to your Vercel domain (e.g. https://your-app.vercel.app).
// Falls back to "*" for local dev where cross-origin is not an issue.
const corsOrigin = process.env.CORS_ORIGIN ?? "*";

const corsHeaders = [
  { key: "Access-Control-Allow-Credentials", value: "true" },
  { key: "Access-Control-Allow-Origin", value: corsOrigin },
  { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Authorization,Content-Type" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // Prevent native-binding packages from being bundled into Edge functions.
  // argon2 uses node-gyp-build(__dirname) at module load time — invalid in Edge runtime.
  serverExternalPackages: ["argon2", "postgres"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: corsHeaders,
      },
    ];
  },
};

export default nextConfig;
