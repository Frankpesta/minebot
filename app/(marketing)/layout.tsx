import type { Metadata } from "next";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: {
    default: "MineBot | AI-Powered Mining Operations",
    template: "%s | MineBot",
  },
  description:
    "MineBot uses advanced AI bots to autonomously optimize your cryptocurrency mining operations 24/7 for maximum profitability.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

