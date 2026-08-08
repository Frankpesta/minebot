import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils";
import { getConvexClient } from "@/lib/convex/client";
import { api } from "@/convex/_generated/api";
import { calculateBalanceUSD } from "@/lib/crypto/valuation";
import { BalanceRow } from "@/components/dashboard/balance-row";

function balanceRows(
  balance: Record<string, number | Record<string, number> | undefined>,
): Array<[string, number]> {
  const rows: Array<[string, number]> = [];
  for (const [key, value] of Object.entries(balance)) {
    if (key === "others") {
      if (value && typeof value === "object") {
        rows.push(...(Object.entries(value) as Array<[string, number]>));
      }
      continue;
    }
    if (typeof value === "number" && value > 0) {
      rows.push([key, value]);
    }
  }
  return rows;
}

export default async function WalletPage() {
  const current = await getCurrentUser();
  if (!current) {
    return null;
  }
  if (current.user.kycStatus !== "approved") {
    redirect("/dashboard/verification");
  }
  const user = current.user;

  const convex = getConvexClient();
  const prices = await convex.query(api.prices.getPrices, {});

  const platformRows = balanceRows(user.platformBalance);
  const miningRows = balanceRows(user.miningBalance);

  const platformBalanceUSD = calculateBalanceUSD(user.platformBalance, prices);
  const miningBalanceUSD = calculateBalanceUSD(user.miningBalance, prices);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Portfolio balances</h1>
        <p className="text-sm text-muted-foreground">
          Overview of platform wallet funds and accumulated mining earnings by asset.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle>Platform wallet</CardTitle>
            <CardDescription>Spendable balance for purchases and withdrawals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {platformRows.length === 0 ? (
              <p className="text-muted-foreground">No funds yet — make a deposit to get started.</p>
            ) : (
              platformRows.map(([coin, value]) => (
                <BalanceRow key={coin} coin={coin} amount={value} priceUSD={prices[coin] ?? 0} />
              ))
            )}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs uppercase tracking-wide text-muted-foreground">
              <span>Total (USD)</span>
              <span className="text-sm font-semibold">{formatCurrency(platformBalanceUSD)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle>Mining earnings</CardTitle>
            <CardDescription>Realized rewards awaiting withdrawal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {miningRows.length === 0 ? (
              <p className="text-muted-foreground">No mining earnings yet.</p>
            ) : (
              miningRows.map(([coin, value]) => (
                <BalanceRow key={coin} coin={coin} amount={value} priceUSD={prices[coin] ?? 0} />
              ))
            )}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs uppercase tracking-wide text-muted-foreground">
              <span>Total (USD)</span>
              <span className="text-sm font-semibold">{formatCurrency(miningBalanceUSD)}</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
