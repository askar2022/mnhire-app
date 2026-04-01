/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js', 'resend'],
}

module.exports = nextConfig
