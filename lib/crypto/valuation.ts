/**
 * Framework-free helpers for valuing and mutating the platform's per-crypto
 * balance objects in USD. Safe to import from both Convex functions and
 * Next.js code — no fetch, no side effects.
 */

import { STABLECOINS } from "./constants";

export type BalanceObject = {
  others?: Record<string, number>;
  [key: string]: number | Record<string, number> | undefined;
};

/** Named fields on `users.platformBalance` (excluding `others`), schema order. */
export const PLATFORM_BALANCE_FIELDS = [
  "ETH",
  "USDT",
  "USDC",
  "BTC",
  "SOL",
  "LTC",
  "BNB",
  "ADA",
  "XRP",
  "DOGE",
  "DOT",
  "MATIC",
  "AVAX",
  "ATOM",
  "LINK",
  "UNI",
] as const;

/** Named fields on `users.miningBalance` (excluding `others`), schema order. */
export const MINING_BALANCE_FIELDS = [
  "BTC",
  "ETH",
  "LTC",
  "SOL",
  "BNB",
  "ADA",
  "XRP",
  "DOGE",
  "DOT",
  "MATIC",
  "AVAX",
  "ATOM",
  "LINK",
  "UNI",
] as const;

function priceFor(coin: string, prices: Record<string, number>): number {
  const symbol = coin.toUpperCase();
  if (STABLECOINS.has(symbol)) return 1;
  return prices[symbol] ?? 0;
}

/** Sum a balance object (named fields + `others`) into a USD total. */
export function calculateBalanceUSD(
  balance: BalanceObject,
  prices: Record<string, number>,
): number {
  let totalUSD = 0;

  for (const [key, value] of Object.entries(balance)) {
    if (key === "others") {
      if (value && typeof value === "object") {
        for (const [coin, amount] of Object.entries(value as Record<string, number>)) {
          totalUSD += (amount ?? 0) * priceFor(coin, prices);
        }
      }
      continue;
    }
    if (typeof value === "number" && value !== 0) {
      totalUSD += value * priceFor(key, prices);
    }
  }

  return totalUSD;
}

/** Read a single coin's amount, falling back to the `others` record. */
export function getBalanceAmount(balance: BalanceObject, crypto: string): number {
  const key = crypto.toUpperCase();
  const direct = balance[key];
  if (typeof direct === "number") return direct;
  return balance.others?.[key] ?? 0;
}

/**
 * Write a single coin's amount. Uses the named field if it's part of the
 * schema for this balance type, otherwise stores it in `others`.
 */
export function setBalanceAmount(
  balance: BalanceObject,
  crypto: string,
  value: number,
  knownFields: readonly string[],
): BalanceObject {
  const key = crypto.toUpperCase();
  if (knownFields.includes(key)) {
    return { ...balance, [key]: value };
  }
  return {
    ...balance,
    others: { ...(balance.others ?? {}), [key]: value },
  };
}

export type DeductResult<T extends BalanceObject> = {
  balance: T;
  deductedUSD: number;
  shortfallUSD: number;
};

/**
 * Deduct a USD amount from a balance object, spending stablecoins first
 * (no conversion risk), then the rest of the named fields in schema order,
 * then whatever's parked in `others`. Returns the updated balance and any
 * USD amount that couldn't be covered (0 if fully covered).
 */
export function deductUsdFromBalance<T extends BalanceObject>(
  balance: T,
  amountUSD: number,
  prices: Record<string, number>,
  orderedKnownFields: readonly string[],
): DeductResult<T> {
  let remaining = amountUSD;
  const next: BalanceObject = { ...balance };
  const others: Record<string, number> = { ...(balance.others ?? {}) };

  const priorityOrder = [
    ...["USDC", "USDT"].filter((c) => orderedKnownFields.includes(c)),
    ...orderedKnownFields.filter((c) => c !== "USDC" && c !== "USDT"),
  ];

  for (const key of priorityOrder) {
    if (remaining <= 0) break;
    const held = typeof next[key] === "number" ? (next[key] as number) : 0;
    if (held <= 0) continue;
    const price = priceFor(key, prices);
    if (price <= 0) continue;

    const heldUSD = held * price;
    if (heldUSD <= remaining) {
      next[key] = 0;
      remaining -= heldUSD;
    } else {
      next[key] = held - remaining / price;
      remaining = 0;
    }
  }

  if (remaining > 0) {
    for (const coin of Object.keys(others)) {
      if (remaining <= 0) break;
      const held = others[coin] ?? 0;
      if (held <= 0) continue;
      const price = priceFor(coin, prices);
      if (price <= 0) continue;

      const heldUSD = held * price;
      if (heldUSD <= remaining) {
        others[coin] = 0;
        remaining -= heldUSD;
      } else {
        others[coin] = held - remaining / price;
        remaining = 0;
      }
    }
  }
  next.others = others;

  return {
    balance: next as T,
    deductedUSD: amountUSD - remaining,
    shortfallUSD: remaining,
  };
}
