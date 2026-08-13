"use client";

import { useState, useTransition } from "react";
import { Check, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { purchasePlan } from "@/app/(dashboard)/dashboard/mining-packages/actions";
import type { Id } from "@/convex/_generated/dataModel";

type Plan = {
  _id: string;
  name: string;
  hashRate: number;
  hashRateUnit: "TH/s" | "GH/s" | "MH/s";
  duration: number;
  priceUSD: number;
  minPriceUSD?: number;
  maxPriceUSD?: number;
  supportedCoins: string[];
  dailyROI: number;
  features: string[];
};

type PlanCardProps = {
  plan: Plan;
  userId: string;
  userBalance: number;
};

function PlanCard({ plan, userId, userBalance }: PlanCardProps) {
  const [isPurchasing, startPurchase] = useTransition();
  const minAmount = plan.minPriceUSD ?? plan.priceUSD;
  const maxAmount = plan.maxPriceUSD;
  const [amount, setAmount] = useState(String(minAmount));
  const canAfford = userBalance >= minAmount;

  const amountNumber = Number(amount);
  const amountError = Number.isNaN(amountNumber)
    ? "Enter a valid amount"
    : amountNumber < minAmount
      ? `Minimum investment is ${formatCurrency(minAmount)}`
      : maxAmount !== undefined && amountNumber > maxAmount
        ? `Maximum investment is ${formatCurrency(maxAmount)}`
        : amountNumber > userBalance
          ? "Amount exceeds your platform balance"
          : null;

  const handlePurchase = (coin: string) => {
    if (amountError) {
      toast.error(amountError);
      return;
    }

    startPurchase(async () => {
      try {
        await purchasePlan({
          userId: userId as Id<"users">,
          planId: plan._id as Id<"plans">,
          coin,
          amountUSD: amountNumber,
        });
        toast.success(`Successfully purchased ${plan.name}! Mining operation started.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to purchase mining package");
      }
    });
  };

  return (
    <Card className="flex flex-col border-border/60 bg-card/80">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription>
              {plan.hashRate} {plan.hashRateUnit} • {plan.duration} days
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {formatCurrency(minAmount)}
              {maxAmount !== undefined ? ` – ${formatCurrency(maxAmount)}` : "+"}
            </p>
            <p className="text-xs text-muted-foreground">Investment range</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Daily ROI</p>
          <p className="text-lg font-semibold text-emerald-500">{plan.dailyROI}%</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">Supported coins</p>
          <div className="flex flex-wrap gap-2">
            {plan.supportedCoins.map((coin) => (
              <span
                key={coin}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {coin}
              </span>
            ))}
          </div>
        </div>

        {plan.features.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Features</p>
            <ul className="space-y-1.5">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={!canAfford || isPurchasing}>
              <Zap className="mr-2 h-4 w-4" />
              {isPurchasing ? "Processing..." : canAfford ? "Purchase Package" : "Insufficient balance"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase {plan.name}</DialogTitle>
              <DialogDescription>
                Select a coin to mine and confirm your purchase.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Investment range</span>
                  <span className="font-semibold">
                    {formatCurrency(minAmount)}
                    {maxAmount !== undefined ? ` – ${formatCurrency(maxAmount)}` : "+"}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold">{plan.duration} days</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Hash rate</span>
                  <span className="font-semibold">
                    {plan.hashRate} {plan.hashRateUnit}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`amount-${plan._id}`}>Amount to invest (USD)</Label>
                <Input
                  id={`amount-${plan._id}`}
                  type="number"
                  min={minAmount}
                  max={maxAmount}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {amountError ? (
                  <p className="text-xs text-destructive">{amountError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Daily earning at purchase: {formatCurrency((plan.dailyROI / 100) * amountNumber)}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Select coin to mine</p>
                <div className="grid grid-cols-2 gap-2">
                  {plan.supportedCoins.map((coin) => (
                    <Button
                      key={coin}
                      variant="outline"
                      className="w-full"
                      onClick={() => handlePurchase(coin)}
                      disabled={isPurchasing || !!amountError}
                    >
                      {coin}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

type PlansMarketplaceProps = {
  plans: Plan[];
  userId: string;
  userBalance: number;
};

export function PlansMarketplace({ plans, userId, userBalance }: PlansMarketplaceProps) {
  if (plans.length === 0) {
    return (
      <Card className="border-border/60 bg-card/80">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No plans available at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan._id} plan={plan} userId={userId} userBalance={userBalance} />
      ))}
    </div>
  );
}

