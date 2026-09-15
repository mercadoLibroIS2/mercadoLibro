/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:8085"
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
