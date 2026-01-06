import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Empty turbopack config to silence webpack warning
  turbopack: {},
}

export default nextConfig
