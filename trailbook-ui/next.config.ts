import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow loading badge/media images from S3 (and other remote hosts).
    // If you use a different bucket/domain per environment, you can set:
    // NEXT_PUBLIC_MEDIA_BASE_URL=https://your-bucket.s3.amazonaws.com/
    remotePatterns: [
      {
        protocol: "https",
        hostname: "trailbook-media-shubham.s3.ap-south-1.amazonaws.com",
        pathname: "/**",
      },
      // Used in Navbar fallback avatars
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
