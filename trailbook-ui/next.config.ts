import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production
  swcMinify: true,
  compress: true,
  
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
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Reduce bundle size in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Webpack optimizations for better memory usage
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Split large dependencies to reduce memory per chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
