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
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  poweredByHeader: false,
  compress: true,
  // السماح لجميع مشغلات الفيديو والـ iframes الخارجية (Viemox, Vimeo, YouTube, إلخ)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https: http: blob: data:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
