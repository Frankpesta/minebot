import type { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Access MineBot",
    template: "%s | MineBot",
  },
  description:
    "Secure access to MineBot. Create an account, verify your email, and deploy your AI-powered mining bots effortlessly.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-background md:grid-cols-[1fr_480px]">
      <div className="relative hidden items-center justify-center bg-gradient-to-br from-amber-950 via-amber-900 to-amber-800 px-12 text-amber-50 md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.25),_transparent_55%)]" />
        <div className="relative z-10 flex max-w-md flex-col gap-8">
          <div>
            <span className="text-sm uppercase tracking-[0.4em] text-amber-300">
              MineBot
            </span>
            <h2 className="mt-4 text-3xl font-bold leading-tight">
              AI-powered mining operations platform
            </h2>
          </div>
          <p className="text-sm text-amber-100/80">
            Deploy AI-powered mining bots, monitor autonomous operations, and optimize your 
            cryptocurrency mining with advanced algorithms. Secure email-first authentication included.
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide text-amber-200/80">
            <FeatureBadge>Realtime dashboards</FeatureBadge>
            <FeatureBadge>Convex powered</FeatureBadge>
            <FeatureBadge>Viem settlements</FeatureBadge>
            <FeatureBadge>Resend notifications</FeatureBadge>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background px-6 py-12 sm:px-10">
        <div className="w-full max-w-md space-y-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              MB
            </span>
            Back to site
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            {children}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link
              href="/legal/terms"
              className="font-medium text-primary hover:underline"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
              className="font-medium text-primary hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide",
      )}
    >
      {children}
    </span>
  );
}

