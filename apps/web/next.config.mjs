/** @type {import('next').NextConfig} */
// В dev /api/* проксируем в NestJS (4000), чтобы фронт ходил по
// относительному пути и в dev, и за reverse-proxy на проде.
const API_TARGET = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: API_TARGET,
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_TARGET}/api/:path*` }];
  },
};
export default nextConfig;
