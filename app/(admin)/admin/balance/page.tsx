import { getConvexClient } from "@/lib/convex/client";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BalanceAdjustmentTabs } from "@/components/admin/balance-adjustment-form";

export default async function AdminBalancePage() {
  const convex = getConvexClient();
  const users = await convex.query(api.usersAdmin.listAllUsers, { limit: 500 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Balance adjustments</h1>
        <p className="text-sm text-muted-foreground">
          Add or remove funds from user platform balances. All changes are logged for audit.
        </p>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Adjust user balance</CardTitle>
          <CardDescription>
            Select a user, choose the asset, and enter a USD amount. Use the Add or Subtract tab to
            choose the direction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BalanceAdjustmentTabs
            users={users.map((u) => ({ _id: u._id, email: u.email }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
