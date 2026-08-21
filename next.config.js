/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'tkrygfflhrvgveiolhsl.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.bunny.net' },
      { protocol: 'https', hostname: '*.vdocipher.com' },
      { protocol: 'https', hostname: '*.vimeo.com' },
      { protocol: 'https', hostname: '*.vimeocdn.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  poweredByHeader: false,
  compress: true,
  // السماح لـ Vimeo و YouTube بالظهور داخل iframe
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://player.vimeo.com https://www.youtube.com https://www.youtube-nocookie.com;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
