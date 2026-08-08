import { v } from "convex/values";

import { query, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { SUPPORTED_CRYPTO, COINGECKO_ID_MAP } from "../lib/crypto/constants";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
// CoinGecko's free tier rate-limits hard on shared/cloud IPs; a burst of
// retries just prolongs the 429 window without helping, so we retry once
// and let the 5-minute cron naturally serve as the retry loop.
const MAX_RETRIES = 1;
const INITIAL_RETRY_DELAY_MS = 1500;

/** Coins we actually need a live price for (stablecoins are pinned to 1). */
const PRICED_COINS = SUPPORTED_CRYPTO.filter((c) => c !== "USDT" && c !== "USDC");

/**
 * Cold-start / rate-limit fallback, used only for a symbol that has never
 * been cached yet. Rough order-of-magnitude figures — just enough to avoid
 * valuing a coin at $0 while CoinGecko is rate-limited; self-corrects as
 * soon as `refreshPrices` succeeds.
 */
const BOOTSTRAP_FALLBACK_PRICES: Partial<Record<string, number>> = {
  BTC: 95000,
  ETH: 3300,
  SOL: 180,
  LTC: 100,
  BNB: 600,
  ADA: 0.7,
  XRP: 2.2,
  DOGE: 0.3,
  DOT: 5,
  MATIC: 0.4,
  AVAX: 30,
  ATOM: 5,
  LINK: 15,
  UNI: 10,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLivePrices(): Promise<Record<string, number>> {
  const ids = PRICED_COINS.map((coin) => COINGECKO_ID_MAP[coin]).join(",");
  const prices: Record<string, number> = {};

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`,
        { headers: { Accept: "application/json" } },
      );

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        console.warn("[prices] CoinGecko rate limited, giving up after retries");
        return prices;
      }

      if (!response.ok) {
        console.warn(`[prices] CoinGecko returned ${response.status}`);
        if (attempt < MAX_RETRIES) {
          await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        return prices;
      }

      const data = await response.json();
      for (const coin of PRICED_COINS) {
        const usd = data[COINGECKO_ID_MAP[coin]]?.usd;
        if (typeof usd === "number" && usd > 0) {
          prices[coin] = usd;
        }
      }
      return prices;
    } catch (error) {
      console.warn(`[prices] fetch error on attempt ${attempt + 1}/${MAX_RETRIES + 1}:`, error);
      if (attempt < MAX_RETRIES) {
        await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  return prices;
}

/** Internal: upsert freshly fetched prices into the cache table. */
export const upsertPrices = internalMutation({
  args: { prices: v.record(v.string(), v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const [symbol, usdPrice] of Object.entries(args.prices)) {
      if (!(usdPrice > 0)) continue;
      const existing = await ctx.db
        .query("cryptoPrices")
        .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { usdPrice, updatedAt: now });
      } else {
        await ctx.db.insert("cryptoPrices", { symbol, usdPrice, updatedAt: now });
      }
    }
  },
});

/** Cron-driven: fetch live prices from CoinGecko and refresh the cache. */
export const refreshPrices = internalAction({
  args: {},
  handler: async (ctx) => {
    const prices = await fetchLivePrices();
    if (Object.keys(prices).length === 0) {
      console.warn("[prices] refreshPrices fetched nothing, leaving cache untouched");
      return;
    }
    await ctx.runMutation(internal.prices.upsertPrices, { prices });
  },
});

/** Public: current cached USD price per symbol, stablecoins pinned to 1. */
export const getPrices = query({
  args: {},
  handler: async (ctx) => {
    return getPriceMap(ctx);
  },
});

/**
 * Server-side helper (not a Convex function) for use inside other
 * queries/mutations that need USD prices without a network round trip.
 */
export async function getPriceMap(ctx: QueryCtx | MutationCtx): Promise<Record<string, number>> {
  const rows = await ctx.db.query("cryptoPrices").collect();
  const prices: Record<string, number> = { USDT: 1, USDC: 1 };

  for (const row of rows) {
    prices[row.symbol] = row.usdPrice;
  }

  for (const [symbol, fallback] of Object.entries(BOOTSTRAP_FALLBACK_PRICES)) {
    if (prices[symbol] === undefined && fallback !== undefined) {
      prices[symbol] = fallback;
    }
  }

  return prices;
}
