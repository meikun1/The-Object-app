/** @type {import('next').NextConfig} */
// /api/booking обрабатывает Next.js route handler (apps/web/app/api/booking).
// Для VPS-варианта прода /api/* проксирует Caddy в NestJS — конфиг web
// в это не вмешивается.
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
