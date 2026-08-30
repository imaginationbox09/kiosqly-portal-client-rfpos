/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Permite compilar a producción aunque existan advertencias/errores de TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
