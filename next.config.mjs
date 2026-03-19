/** @type {import('next').NextConfig} */
// Force restart
const nextConfig = {
    compress: true,
    experimental: {
        serverActions: {
            allowedOrigins: ["localhost:3000"],
            bodySizeLimit: '4mb',
        },
        optimizePackageImports: ['lucide-react'],
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.supabase.co",
            },
        ],
    },
};

export default nextConfig;
