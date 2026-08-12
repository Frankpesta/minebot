"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "convex/react";

import { submitDepositRequest } from "@/app/(dashboard)/dashboard/purchase-hashpower/actions";
import {
  depositRequestSchema,
  type DepositRequestInput,
  type DepositRequestValues,
} from "@/app/(dashboard)/dashboard/purchase-hashpower/validators";
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
import { toast } from "@/components/ui/use-toast";
import type { SupportedCrypto } from "@/lib/crypto/constants";
import { MIN_DEPOSIT } from "@/lib/crypto/constants";
import { formatCurrency } from "@/lib/utils";

type WalletOption = {
  crypto: string;
  address: string;
  label?: string | null;
};

type DepositFormProps = {
  wallets: WalletOption[];
  minimums?: Partial<Record<SupportedCrypto, number>>;
};

export function DepositForm({ wallets, minimums }: DepositFormProps) {
  const [isSubmitting, startSubmit] = useTransition();
  const [usdAmount, setUsdAmount] = useState("");

  const walletMap = wallets.reduce<Record<string, WalletOption>>((acc, wallet) => {
    acc[wallet.crypto] = wallet;
    return acc;
  }, {});

  const defaultCrypto = wallets[0]?.crypto ?? "ETH";
  const isDisabled = wallets.length === 0;

  const prices = useQuery(api.prices.getPrices, {});

  const form = useForm<DepositRequestInput>({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: {
      crypto: defaultCrypto,
      amount: "",
      txHash: "",
    },
  });

  const selectedCrypto = form.watch("crypto") as SupportedCrypto;
  const selectedWallet = selectedCrypto ? walletMap[selectedCrypto] : undefined;
  const minAmount = minimums?.[selectedCrypto] ?? MIN_DEPOSIT[selectedCrypto] ?? 0;
  const price = prices?.[selectedCrypto] ?? 0;
  const usdNumber = Number(usdAmount) || 0;
  const cryptoAmount = price > 0 ? usdNumber / price : 0;
  const minimumUSD = minAmount * price;

  useEffect(() => {
    form.setValue("amount", cryptoAmount);
  }, [form, cryptoAmount]);

  // Reset the USD input when the selected asset changes so amounts aren't
  // silently re-interpreted against a different price.
  useEffect(() => {
    setUsdAmount("");
  }, [selectedCrypto]);

  async function handleSubmit(rawValues: DepositRequestInput) {
    if (!price) {
      toast.error("Live pricing isn't available yet. Please try again shortly.");
      return;
    }

    const parsed = depositRequestSchema.safeParse(rawValues);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid deposit request.");
      return;
    }

    const values: DepositRequestValues = { ...parsed.data, amount: cryptoAmount };

    if (minAmount && values.amount < minAmount) {
      toast.error(`Minimum deposit for ${values.crypto} is ${minAmount} (${formatCurrency(minimumUSD)}).`);
      return;
    }

    startSubmit(async () => {
      const response = await submitDepositRequest(values);
      if (response.success) {
        toast.success("Deposit request submitted. We'll notify you once it's approved.");
        setUsdAmount("");
        form.reset({
          crypto: values.crypto,
          amount: "",
          txHash: "",
        });
      } else {
        toast.error(response.error ?? "Unable to submit deposit request.");
      }
    });
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
                  disabled={isDisabled}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.crypto} value={wallet.crypto}>
                      {wallet.crypto} {wallet.label ? `• ${wallet.label}` : ""}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Minimum deposit: {price ? `${formatCurrency(minimumUSD)} (${minAmount} ${selectedCrypto})` : `${minAmount} ${selectedCrypto}`}
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
              placeholder="Enter amount in USD"
              value={usdAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsdAmount(e.target.value)}
              disabled={isDisabled || !price}
            />
          </FormControl>
          <FormDescription>
            {price
              ? `≈ ${cryptoAmount.toFixed(6)} ${selectedCrypto}. Funds must be sent from an address you control. Deposits are credited after admin review.`
              : "Loading live prices…"}
          </FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name="txHash"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction hash (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="0x..."
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  disabled={isDisabled}
                />
              </FormControl>
              <FormDescription>
                Provide the transaction hash to expedite review once you transfer the funds.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedWallet ? (
          <div className="rounded-md border border-dashed border-primary/40 bg-primary/10 p-3 text-xs">
            <p className="font-semibold uppercase tracking-wide text-primary">
              Deposit address ({selectedWallet.crypto})
            </p>
            <p className="mt-1 font-mono text-sm break-all">{selectedWallet.address}</p>
            <button
              type="button"
              className="mt-2 inline-flex items-center text-xs font-semibold text-primary"
              onClick={() => handleCopy(selectedWallet.address)}
            >
              Copy address
            </button>
          </div>
        ) : null}

        {isDisabled ? (
          <p className="text-center text-xs text-muted-foreground">
            No deposit wallets available. Contact an administrator to configure deposit addresses.
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting || isDisabled || !price || usdNumber <= 0} className="w-full">
          {isSubmitting ? "Submitting…" : "Submit deposit request"}
        </Button>
      </form>
    </Form>
  );
}

async function handleCopy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Address copied to clipboard");
  } catch (error) {
    toast.error("Unable to copy address. Copy manually instead.");
  }
}

