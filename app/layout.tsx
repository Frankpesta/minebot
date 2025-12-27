import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { ConvexProvider } from "@/components/providers/convex-provider";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});


export const metadata: Metadata = {
  title: {
    default: "MineBot | AI-Powered Mining Operations",
    template: "%s | MineBot",
  },
  description:
    "MineBot is an AI-powered mining operations platform with advanced bots that autonomously optimize cryptocurrency mining 24/7 for maximum profitability.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
      >
        <ConvexProvider>
          <WalletProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <div className="min-h-screen bg-background text-foreground">{children}</div>
              <Toaster />
            </ThemeProvider>
          </WalletProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
