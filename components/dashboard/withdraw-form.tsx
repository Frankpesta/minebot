"use client";

import React from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "convex/react";

import { submitWithdrawalRequest } from "@/app/(dashboard)/dashboard/withdraw/actions";
import {
  withdrawalRequestSchema,
  type WithdrawalRequestInput,
  type WithdrawalRequestValues,
} from "@/app/(dashboard)/dashboard/withdraw/validators";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { getWithdrawalFee } from "@/lib/payments/fees";
import type { SupportedCrypto } from "@/lib/crypto/constants";
import { MIN_WITHDRAWAL } from "@/lib/crypto/constants";
import { formatCurrency } from "@/lib/utils";

type WithdrawFormProps = {
  balances: Record<string, number>;
};

export function WithdrawForm({ balances }: WithdrawFormProps) {
  const [isSubmitting, startSubmit] = useTransition();
  const [usdAmount, setUsdAmount] = useState("");
  const availableCryptos = (Object.entries(balances) as Array<[SupportedCrypto, number]>)
    .filter(([, value]) => value > 0)
    .map(([asset]) => asset);
  const defaultCrypto = availableCryptos[0] ?? "USDT";

  const prices = useQuery(api.prices.getPrices, {});

  const form = useForm<WithdrawalRequestInput>({
    resolver: zodResolver(withdrawalRequestSchema),
    defaultValues: {
      crypto: defaultCrypto,
      amount: "",
      destinationAddress: "",
      requestedFee: "",
      note: "",
    },
  });

  const crypto = form.watch("crypto") as SupportedCrypto;
  const price = prices?.[crypto] ?? 0;
  const usdNumber = Number(usdAmount) || 0;
  const cryptoAmount = price > 0 ? usdNumber / price : 0;
  const available = balances[crypto] ?? 0;
  const availableUSD = available * price;
  const networkFee = useMemo(() => getWithdrawalFee(crypto, cryptoAmount), [crypto, cryptoAmount]);
  const finalAmount = cryptoAmount > networkFee ? cryptoAmount - networkFee : 0;
  const minimum = MIN_WITHDRAWAL[crypto] ?? 0;
  const minimumUSD = minimum * price;

  useEffect(() => {
    form.setValue("amount", cryptoAmount);
    form.setValue("requestedFee", networkFee);
  }, [form, cryptoAmount, networkFee]);

  // Reset the USD input when the selected asset changes so amounts aren't
  // silently re-interpreted against a different price.
  useEffect(() => {
    setUsdAmount("");
  }, [crypto]);

  async function handleSubmit(rawValues: WithdrawalRequestInput) {
    if (!price) {
      toast.error("Live pricing isn't available yet. Please try again shortly.");
      return;
    }

    const parsed = withdrawalRequestSchema.safeParse(rawValues);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid withdrawal request.");
      return;
    }

    const values: WithdrawalRequestValues = {
      ...parsed.data,
      amount: cryptoAmount,
      requestedFee: networkFee,
    };

    if (values.amount < minimum) {
      toast.error(
        `Minimum withdrawal for ${values.crypto} is ${minimum} (${formatCurrency(minimumUSD)}).`,
      );
      return;
    }

    if (values.amount > available) {
      toast.error(
        `Insufficient ${values.crypto} balance. Available: ${formatCurrency(availableUSD)}.`,
      );
      return;
    }

    startSubmit(async () => {
      const response = await submitWithdrawalRequest(values);
      if (response.success) {
        toast.success(
          `Withdrawal submitted. Estimated network fee ${response.fee} ${values.crypto}.`,
        );
        setUsdAmount("");
        form.reset({
          crypto: values.crypto,
          amount: "",
          destinationAddress: "",
          requestedFee: "",
          note: "",
        });
      } else {
        toast.error(response.error ?? "Unable to submit withdrawal request.");
      }
    });
  }

  if (availableCryptos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No balance available for withdrawal. Deposit funds to your platform wallet first.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="crypto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {availableCryptos.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset} • Available {(balances[asset] ?? 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Minimum withdrawal: {formatCurrency(minimumUSD)} ({minimum} {crypto})
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Amount (USD)</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="any"
              min={0}
              max={availableUSD}
              placeholder="Enter amount in USD"
              value={usdAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsdAmount(e.target.value)}
              disabled={!price}
            />
          </FormControl>
          <FormDescription>
            {price
              ? `≈ ${cryptoAmount.toFixed(6)} ${crypto} · Available: ${formatCurrency(availableUSD)} (${available.toLocaleString()} ${crypto})`
              : "Loading live prices…"}
          </FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name="destinationAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="0x... or exchange address"
                  spellCheck={false}
                  autoComplete="off"
                />
              </FormControl>
              <FormDescription>
                Double-check the address. Withdrawals are irreversible once executed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for admins (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Add context for this withdrawal (optional)"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-3 text-xs">
          <p className="flex items-center justify-between">
            <span>Estimated network fee</span>
            <span className="font-semibold">
              {networkFee.toFixed(6)} {crypto} ({formatCurrency(networkFee * price)})
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span>Estimated payout</span>
            <span className="font-semibold">
              {finalAmount > 0
                ? `${finalAmount.toFixed(6)} ${crypto} (${formatCurrency(finalAmount * price)})`
                : "—"}
            </span>
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting || !price || usdNumber <= 0} className="w-full">
          {isSubmitting ? "Submitting…" : "Request withdrawal"}
        </Button>
      </form>
    </Form>
  );
}

