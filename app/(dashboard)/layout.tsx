import { notFound, redirect } from "next/navigation";
import Script from "next/script";

import { signOutAction } from "@/app/(dashboard)/actions";
import { AppShell } from "@/components/layout/app-shell";
import type { SidebarNavItem } from "@/components/dashboard/sidebar-nav";
import { getCurrentUser } from "@/lib/auth/session";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/purchase-hashpower", label: "Purchase HashPower", icon: "wallet" },
  { href: "/dashboard/mining-packages", label: "Mining Packages", icon: "layers" },
  { href: "/dashboard/mining", label: "Mining Ops", icon: "gauge" },
  { href: "/dashboard/activity", label: "Activity", icon: "chart-line" },
  { href: "/dashboard/wallet", label: "Wallet", icon: "coins" },
  { href: "/dashboard/withdraw", label: "Withdraw", icon: "waypoints" },
  { href: "/dashboard/tickets", label: "Support", icon: "message-square" },
  { href: "/dashboard/profile", label: "Profile", icon: "users" },
] satisfies SidebarNavItem[];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();
  if (!current) {
    notFound();
  }

  const { user } = current;

  if (user.role === "admin") {
    redirect("/admin");
  }

  return (
    <>
      <Script
        id="smartsupp-chat"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var _smartsupp = _smartsupp || {};
            _smartsupp.key = '80491241bcf72f6c209a9d3f2e80423a1fc472c9';
            window.smartsupp||(function(d) {
              var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
              s=d.getElementsByTagName('script')[0];c=d.createElement('script');
              c.type='text/javascript';c.charset='utf-8';c.async=true;
              c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
            })(document);
          `,
        }}
      />
      <noscript>
        Powered by <a href="https://www.smartsupp.com" target="_blank" rel="noopener noreferrer">Smartsupp</a>
      </noscript>
      <AppShell
        brand={{ initials: "NBP", title: "NovaxBlockPool", subtitle: "AI Mining Operations" }}
        navigation={navigation}
        user={user}
        signOutAction={signOutAction}
        headerDescription={user.email}
      >
        {children}
      </AppShell>
    </>
  );
}