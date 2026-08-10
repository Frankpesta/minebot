import { ConvexError, v } from "convex/values";

import { mutation, query, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getPriceMap } from "./prices";
import { calculateBalanceUSD, deductUsdFromBalance, PLATFORM_BALANCE_FIELDS } from "../lib/crypto/valuation";

export const listPlans = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const plans = args.activeOnly
      ? await ctx.db
          .query("plans")
          .withIndex("by_active", (q) => q.eq("isActive", true))
          .collect()
      : await ctx.db.query("plans").collect();

    return plans.sort((a, b) => a.order - b.order);
  },
});

/**
 * Internal query to list all plans (for internal use)
 */
export const listAllPlansInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();
    return plans.sort((a, b) => a.order - b.order);
  },
});

export const getPlanById = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.planId);
  },
});

export const createPlan = mutation({
  args: {
    name: v.string(),
    hashRate: v.number(),
    hashRateUnit: v.union(v.literal("TH/s"), v.literal("GH/s"), v.literal("MH/s")),
    duration: v.number(), // Duration in days
    minPriceUSD: v.number(),
    maxPriceUSD: v.optional(v.number()),
    priceUSD: v.number(), // Default/display price
    supportedCoins: v.array(v.string()),
    dailyROI: v.number(), // Fixed daily ROI percentage, independent of hash rate
    isActive: v.boolean(),
    features: v.array(v.string()),
    idealFor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingPlans = await ctx.db.query("plans").collect();
    const maxOrder = existingPlans.reduce(
      (max, plan) => Math.max(max, plan.order),
      -1,
    );
    const now = Date.now();

    return ctx.db.insert("plans", {
      ...args,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
    });
  },
});

export const updatePlan = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    hashRate: v.optional(v.number()),
    hashRateUnit: v.optional(v.union(v.literal("TH/s"), v.literal("GH/s"), v.literal("MH/s"))),
    duration: v.optional(v.number()),
    minPriceUSD: v.optional(v.number()),
    maxPriceUSD: v.optional(v.number()),
    priceUSD: v.optional(v.number()),
    supportedCoins: v.optional(v.array(v.string())),
    dailyROI: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    features: v.optional(v.array(v.string())),
    idealFor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { planId, ...updates } = args;
    const plan = await ctx.db.get(planId);
    if (!plan) {
      throw new ConvexError("Plan not found");
    }

    await ctx.db.patch(planId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deletePlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new ConvexError("Plan not found");
    }

    const activeOperations = await ctx.db
      .query("miningOperations")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const hasActiveOperations = activeOperations.some(
      (op) => op.planId === args.planId,
    );

    if (hasActiveOperations) {
      throw new ConvexError("Cannot delete plan with active mining operations");
    }

    await ctx.db.delete(args.planId);
  },
});

export const reorderPlans = mutation({
  args: {
    planOrders: v.array(
      v.object({
        planId: v.id("plans"),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.planOrders.map(({ planId, order }) =>
        ctx.db.patch(planId, {
          order,
          updatedAt: Date.now(),
        }),
      ),
    );
  },
});

export const purchasePlan = mutation({
  args: {
    userId: v.id("users"),
    planId: v.id("plans"),
    coin: v.string(),
  },
  handler: async (ctx, args) => {
    const [user, plan] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.get(args.planId),
    ]);

    if (!user) {
      throw new ConvexError("User not found");
    }

    if (!plan) {
      throw new ConvexError("Plan not found");
    }

    if (!plan.isActive) {
      throw new ConvexError("Plan is not active");
    }

    // Only BTC and ETH can be mined
    if (args.coin !== "BTC" && args.coin !== "ETH") {
      throw new ConvexError(`Only BTC and ETH can be mined. Received: ${args.coin}`);
    }
    
    if (!plan.supportedCoins.includes(args.coin)) {
      throw new ConvexError(`Coin ${args.coin} is not supported by this plan`);
    }

    const prices = await getPriceMap(ctx);
    const totalBalanceUSD = calculateBalanceUSD(user.platformBalance, prices);

    // Use minPriceUSD as minimum, or priceUSD if minPriceUSD doesn't exist (backward compatibility)
    const minPrice = plan.minPriceUSD ?? plan.priceUSD;
    if (totalBalanceUSD < minPrice) {
      throw new ConvexError(`Insufficient platform balance. Minimum required: $${minPrice.toFixed(2)}`);
    }

    // Determine purchase amount
    // If maxPriceUSD is set and user has more than max, use max
    // Otherwise, use the user's total balance (as long as it's >= min)
    let purchaseAmount = totalBalanceUSD;
    if (plan.maxPriceUSD !== undefined && totalBalanceUSD > plan.maxPriceUSD) {
      purchaseAmount = plan.maxPriceUSD;
    }

    const now = Date.now();
    // Duration is in days, convert to milliseconds
    const endTime = now + plan.duration * 24 * 60 * 60 * 1000;

    const operationId = await ctx.db.insert("miningOperations", {
      userId: args.userId,
      planId: args.planId,
      coin: args.coin,
      hashRate: plan.hashRate,
      hashRateUnit: plan.hashRateUnit,
      purchaseAmount,
      startTime: now,
      endTime,
      totalMined: 0,
      currentRate: plan.dailyROI, // Store daily ROI percentage
      lastPayoutDate: undefined, // Will be set on first payout
      status: "active",
      pausedBy: undefined,
      createdAt: now,
    });

    const { balance: updatedBalance, shortfallUSD } = deductUsdFromBalance(
      user.platformBalance,
      purchaseAmount,
      prices,
      PLATFORM_BALANCE_FIELDS,
    );

    if (shortfallUSD > 0.01) {
      throw new ConvexError("Insufficient platform balance");
    }

    await ctx.db.patch(args.userId, {
      platformBalance: updatedBalance as typeof user.platformBalance,
    });

    await ctx.db.insert("auditLogs", {
      actorId: args.userId,
      action: "plan:purchase",
      entity: "miningOperation",
      entityId: operationId,
      metadata: {
        planId: args.planId,
        planName: plan.name,
        coin: args.coin,
        purchaseAmount,
        priceUSD: plan.priceUSD,
      },
      createdAt: now,
    });

    return operationId;
  },
});

