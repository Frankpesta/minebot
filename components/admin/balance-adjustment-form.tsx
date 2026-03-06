"use client";

import { useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { adjustBalanceAction } from "@/app/(admin)/admin/balance/actions";
import { SUPPORTED_CRYPTO, CRYPTO_NAMES } from "@/lib/crypto/constants";
import type { SupportedCrypto } from "@/lib/crypto/constants";

type UserOption = { _id: string; email: string };

type Props = {
  users: UserOption[];
};

export function BalanceAdjustmentForm({ users }: Props) {
  const [userId, setUserId] = useState("");
  const [crypto, setCrypto] = useState<SupportedCrypto>("USDT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!userId) {
      toast.error("Select a user");
      return;
    }
    if (Number.isNaN(num) || num === 0) {
      toast.error("Enter a non-zero amount (positive to add, negative to remove)");
      return;
    }
    startTransition(async () => {
      const result = await adjustBalanceAction({
        userId,
        crypto,
        amount: num,
        reason: reason.trim() || undefined,
      });
      if (result.success) {
        toast.success(
          `Balance updated. New ${crypto} balance: ${result.newBalance}. Previous: ${result.previousBalance}`,
        );
        setAmount("");
        setReason("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user">User</Label>
        <Select value={userId} onValueChange={setUserId} required>
          <SelectTrigger id="user">
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
        <Label htmlFor="crypto">Asset</Label>
        <Select
          value={crypto}
          onValueChange={(v) => setCrypto(v as SupportedCrypto)}
        >
          <SelectTrigger id="crypto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CRYPTO.map((c) => (
              <SelectItem key={c} value={c}>
                {c} – {CRYPTO_NAMES[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (positive = add, negative = remove)</Label>
        <Input
          id="amount"
          type="number"
          step="any"
          placeholder="e.g. 100 or -50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional, for audit log)</Label>
        <Textarea
          id="reason"
          placeholder="e.g. Manual credit, refund, correction"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Applying…" : "Apply adjustment"}
      </Button>
    </form>
  );
}
