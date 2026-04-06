/** @type {import('next').NextConfig} */
const cdnHost = process.env.NEXT_PUBLIC_CDN_HOST
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_CDN_HOST

const nextConfig = {
  assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || undefined,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      ...(cdnHost ? [{ protocol: 'https', hostname: cdnHost }] : []),
      ...(mediaHost ? [{ protocol: 'https', hostname: mediaHost }] : []),
    ],
  },
  async headers() {
    return [
      {
        source: '/api/users/:userId/profile-card',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=3600' },
          { key: 'CDN-Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=3600' },
        ],
      },
    ]
  },
}

export default nextConfig
