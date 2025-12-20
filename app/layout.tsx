import type { Metadata } from "next";
import { Inter, Roboto, Poppins } from "next/font/google";
import "./globals.css";
import "@/styles/design-tokens.css";
import ClientLayoutWrapper from "./ClientLayoutWrapper";

const inter = Inter({
    subsets: ["latin", "latin-ext"],
    variable: '--font-inter'
});

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ["latin", "latin-ext"],
    variable: '--font-roboto'
});

const poppins = Poppins({
    weight: ['400', '500', '700'],
    subsets: ["latin", "latin-ext"],
    variable: '--font-poppins'
});

export const metadata: Metadata = {
    title: "AImi chat - Your Personal AI Companions",
    description: "Chat with romantic AI characters who remember and care",
    // PWA meta tags for app-like experience
    other: {
        'apple-mobile-web-app-capable': 'yes',
        'mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${inter.variable} ${roboto.variable} ${poppins.variable} h-full`} suppressHydrationWarning>
            <body className={`${inter.className} h-full`} suppressHydrationWarning>
                <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
            </body>
        </html>
    );
}
