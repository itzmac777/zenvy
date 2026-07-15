import type { NextConfig } from "next";

const imagekitUrl = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const imagekitHost = imagekitUrl ? new URL(imagekitUrl).hostname : "ik.imagekit.io";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      ...(imagekitHost !== "ik.imagekit.io" ? [{ protocol: "https" as const, hostname: imagekitHost }] : []),
    ],
  },
};

export default nextConfig;
