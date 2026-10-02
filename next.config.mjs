import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheStartUrl: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ["youtubei.js", "ffmpeg-static"],
  },
  // Chỉ dùng distDir custom khi dev local trên Windows (set CUSTOM_DIST_DIR=1 trong .env.development.local)
  ...(process.env.CUSTOM_DIST_DIR === "1" ? { distDir: ".next-build" } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  webpack(config, { isServer }) {
    // Prevent Watchpack from scanning Windows system volumes (EINVAL errors)
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/System Volume Information/**",
        "D:/System Volume Information/**",
      ],
    };
    return config;
  },
};

export default withPWA(nextConfig);
