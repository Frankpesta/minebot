import { formatCurrency } from "@/lib/utils";

type BalanceRowProps = {
  coin: string;
  amount: number;
  priceUSD: number;
};

/**
 * Displays a single coin's holding with USD as the primary figure and the
 * raw crypto amount as secondary context — the platform's balances are
 * always denominated in USD, regardless of which crypto backs them.
 */
export function BalanceRow({ coin, amount, priceUSD }: BalanceRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold uppercase tracking-wide">{coin}</p>
        <p className="text-xs text-muted-foreground">
          {amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} {coin}
        </p>
      </div>
      <span className="font-medium tabular-nums">{formatCurrency(amount * priceUSD)}</span>
    </div>
  );
}
