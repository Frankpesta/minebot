"use client";

import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { adjustBalanceAction } from "@/app/(admin)/admin/balance/actions";
import { SUPPORTED_CRYPTO, CRYPTO_NAMES } from "@/lib/crypto/constants";
import type { SupportedCrypto } from "@/lib/crypto/constants";
import { api } from "@/convex/_generated/api";

type UserOption = { _id: string; email: string };

type BalanceType = "platform" | "mining";
type Direction = "add" | "subtract";

type FormProps = {
  direction: Direction;
  users: UserOption[];
};

function BalanceAdjustmentForm({ direction, users }: FormProps) {
  const [userId, setUserId] = useState("");
  const [balanceType, setBalanceType] = useState<BalanceType>("platform");
  const [crypto, setCrypto] = useState<SupportedCrypto>("USDT");
  const [amountUSD, setAmountUSD] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const prices = useQuery(api.prices.getPrices, {});
  const amountNumber = Number(amountUSD);
  const price = prices?.[crypto] ?? 0;
  const cryptoEquivalent = price > 0 && !Number.isNaN(amountNumber) && amountNumber > 0
    ? amountNumber / price
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountUSD);
    if (!userId) {
      toast.error("Select a user");
      return;
    }
    if (Number.isNaN(num) || num <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    startTransition(async () => {
      const result = await adjustBalanceAction({
        userId,
        balanceType,
        crypto,
        direction,
        amountUSD: num,
        reason: reason.trim() || undefined,
      });
      if (result.success) {
        toast.success(
          `Balance updated. New ${crypto} balance: ${result.newBalance}. Previous: ${result.previousBalance}`,
        );
        setAmountUSD("");
        setReason("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`user-${direction}`}>User</Label>
        <Select value={userId} onValueChange={setUserId} required>
          <SelectTrigger id={`user-${direction}`}>
            <SelectValue placeholder="Select user by email" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u._id} value={u._id}>
                {u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`balanceType-${direction}`}>Balance type</Label>
        <Select
          value={balanceType}
          onValueChange={(v) => setBalanceType(v as BalanceType)}
        >
          <SelectTrigger id={`balanceType-${direction}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="platform">Platform balance</SelectItem>
            <SelectItem value="mining">Mining balance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`crypto-${direction}`}>Asset</Label>
        <Select
          value={crypto}
          onValueChange={(v) => setCrypto(v as SupportedCrypto)}
        >
          <SelectTrigger id={`crypto-${direction}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CRYPTO.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "USDT" ? "USDT – Tether (≈ USD)" : `${c} – ${CRYPTO_NAMES[c]}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`amount-${direction}`}>Amount (USD)</Label>
        <Input
          id={`amount-${direction}`}
          type="number"
          min="0"
          step="any"
          placeholder="e.g. 100"
          value={amountUSD}
          onChange={(e) => setAmountUSD(e.target.value)}
          required
        />
        {cryptoEquivalent !== null && (
          <p className="text-xs text-muted-foreground">
            ≈ {cryptoEquivalent.toFixed(6)} {crypto}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`reason-${direction}`}>Reason (optional, for audit log)</Label>
        <Textarea
          id={`reason-${direction}`}
          placeholder="e.g. Manual credit, refund, correction"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" variant={direction === "subtract" ? "destructive" : "default"} disabled={isPending}>
        {isPending
          ? "Applying…"
          : direction === "add"
            ? "Add funds"
            : "Subtract funds"}
      </Button>
    </form>
  );
}

type TabsProps = {
  users: UserOption[];
};

export function BalanceAdjustmentTabs({ users }: TabsProps) {
  return (
    <Tabs defaultValue="add">
      <TabsList>
        <TabsTrigger value="add">Add funds</TabsTrigger>
        <TabsTrigger value="subtract">Subtract funds</TabsTrigger>
      </TabsList>
      <TabsContent value="add">
        <BalanceAdjustmentForm direction="add" users={users} />
      </TabsContent>
      <TabsContent value="subtract">
        <BalanceAdjustmentForm direction="subtract" users={users} />
      </TabsContent>
    </Tabs>
  );
}
