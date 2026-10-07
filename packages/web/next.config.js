/** @type {import("next").NextConfig} */
const defaultTarget = process.env.NODE_ENV === "development" ? "http://localhost:4000" : "https://elabs-topaz.vercel.app";
const apiTarget = (process.env.API_TARGET_URL || process.env.NEXT_PUBLIC_API_URL || defaultTarget).replace(/\/$/, "");

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
  async redirects() {
    return [
      {
        source: "/calendar",
        destination: "/attendance",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;