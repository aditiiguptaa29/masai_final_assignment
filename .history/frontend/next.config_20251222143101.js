/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Docker runner can use standalone output
  output: 'standalone',
  images: {
    domains: ['localhost', 'images.unsplash.com'],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    MONGODB_URI: process.env.MONGODB_URI,
    BACKEND_URL: process.env.BACKEND_URL,
  },
};

module.exports = nextConfig;