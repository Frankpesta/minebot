import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { PlansMarketplace } from "@/components/dashboard/plans-marketplace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getConvexClient } from "@/lib/convex/client";
import { formatCurrency } from "@/lib/utils";

export default async function MiningPackagesPage() {
  const current = await getCurrentUser();
  if (!current) {
    return null;
  }
  if (current.user.kycStatus !== "approved") {
    redirect("/dashboard/verification");
  }

  const convex = getConvexClient();
  const [plans, summary] = await Promise.all([
    convex.query(api.plans.listPlans, { activeOnly: true }),
    convex.query(api.dashboard.getUserDashboardSummary, { userId: current.user._id }),
  ]);

  const totalBalance = summary.metrics.platformBalance;

  const heldCoins = Object.entries(summary.balances.platform)
    .filter(([key, value]) => key !== "others" && typeof value === "number" && value > 0)
    .map(([coin, value]) => `${coin}: ${(value as number).toFixed(4)}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Mining Packages</h1>
        <p className="text-sm text-muted-foreground">
          Browse curated mining contracts with transparent pricing, estimated returns, and
          supported coins.
        </p>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Your platform balance</CardTitle>
          <CardDescription>Available funds for purchasing mining packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline">
            <span className="text-2xl font-bold sm:text-3xl">{formatCurrency(totalBalance)}</span>
            {heldCoins.length > 0 && (
              <span className="text-xs text-muted-foreground sm:text-sm">
                ({heldCoins.join(", ")})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <PlansMarketplace
        plans={plans}
        userId={current.user._id}
        userBalance={totalBalance}
      />
    </div>
  );
}
