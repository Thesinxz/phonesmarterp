/** @type {import('next').NextConfig} */
// Force restart
const nextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: ["localhost:3000"],
            bodySizeLimit: '4mb',
        },
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
