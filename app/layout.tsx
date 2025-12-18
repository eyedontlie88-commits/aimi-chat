import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/design-tokens.css";
import ClientLayoutWrapper from "./ClientLayoutWrapper";

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
        <html lang="en" className="h-full">
            <body className={`${inter.className} h-full`}>
                <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
            </body>
        </html>
    );
}
