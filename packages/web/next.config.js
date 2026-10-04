/** @type {import("next").NextConfig} */
const apiTarget = (process.env.API_TARGET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@elabs/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiTarget}/socket.io/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;