/** @type {import('next').NextConfig} */
const nextConfig = {
    // Bỏ qua lỗi TypeScript khi build production
    typescript: {
        ignoreBuildErrors: true,
    },

    // Transpile Supabase packages to fix ESM compatibility
    transpilePackages: ['@supabase/supabase-js', '@supabase/storage-js', '@supabase/node-fetch'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    // Allow Firebase auth popup to communicate with parent window
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups',
                    },
                ],
            },
        ]
    },
}

module.exports = nextConfig
