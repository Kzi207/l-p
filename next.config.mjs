import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["youtubei.js", "ffmpeg-static"],
  },
  // Tách output production khỏi cache dev để `next build` không làm hỏng
  // vendor chunks khi một dev server đang chạy song song trên Windows.
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default withPWA(nextConfig);
