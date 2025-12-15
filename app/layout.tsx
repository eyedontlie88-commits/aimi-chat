import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Firebase client
const AuthButton = dynamic(() => import("@/components/AuthButton"), {
    ssr: false,
    loading: () => <span className="text-sm text-gray-400">•</span>
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AImi chat - Your Personal AI Companions",
    description: "Chat with romantic AI characters who remember and care",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="min-h-screen gradient-bg">
                    {/* Navigation */}
                    <nav className="glass border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <Link href="/characters" className="flex items-center space-x-2">
                                    <span className="text-2xl">💕</span>
                                    <span className="text-xl font-bold gradient-text">AImi chat</span>
                                </Link>

                                <div className="flex items-center space-x-6">
                                    <Link
                                        href="/characters"
                                        className="text-sm font-medium hover:text-primary-400 transition-colors"
                                    >
                                        Characters
                                    </Link>
                                    <Link
                                        href="/settings"
                                        className="text-sm font-medium hover:text-primary-400 transition-colors"
                                    >
                                        Settings
                                    </Link>
                                    <AuthButton />
                                </div>
                            </div>
                        </div>
                    </nav>

                    {/* Main content */}
                    <main>{children}</main>

                    {/* Footer */}
                    <footer className="border-t border-white/10 mt-20">
                        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
                            <p>Made with 💕 for personal use</p>
                        </div>
                    </footer>
                </div>
            </body>
        </html>
    );
}
