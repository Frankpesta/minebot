import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getPriceMap } from "./prices";
import {
  getBalanceAmount,
  setBalanceAmount,
  PLATFORM_BALANCE_FIELDS,
  MINING_BALANCE_FIELDS,
} from "../lib/crypto/valuation";
import { STABLECOINS } from "../lib/crypto/constants";

export const listAllUsers = query({
  args: {
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    let users = await ctx.db.query("users").collect();

    if (args.role) {
      users = users.filter((user) => user.role === args.role);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter((user) => user.email.toLowerCase().includes(searchLower));
    }

    return users
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

export const getUserDetails = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const [deposits, withdrawals, miningOps] = await Promise.all([
      ctx.db
        .query("deposits")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("withdrawals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("miningOperations")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);

    return {
      user,
      stats: {
        totalDeposits: deposits.length,
        totalWithdrawals: withdrawals.length,
        activeMiningOps: miningOps.filter((op) => op.status === "active").length,
        totalMiningOps: miningOps.length,
      },
    };
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    adminId: v.id("users"),
    newRole: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const [admin, user] = await Promise.all([
      ctx.db.get(args.adminId),
      ctx.db.get(args.userId),
    ]);

    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Only administrators can update user roles");
    }

    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(args.userId, {
      role: args.newRole,
    });

    await ctx.db.insert("auditLogs", {
      actorId: args.adminId,
      action: "user:updateRole",
      entity: "user",
      entityId: args.userId,
      metadata: {
        oldRole: user.role,
        newRole: args.newRole,
      },
      createdAt: Date.now(),
    });
  },
});

export const toggleUserSuspension = mutation({
  args: {
    userId: v.id("users"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const [admin, user] = await Promise.all([
      ctx.db.get(args.adminId),
      ctx.db.get(args.userId),
    ]);

    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Only administrators can suspend users");
    }

    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(args.userId, {
      isSuspended: !user.isSuspended,
    });

    await ctx.db.insert("auditLogs", {
      actorId: args.adminId,
      action: user.isSuspended ? "user:unsuspend" : "user:suspend",
      entity: "user",
      entityId: args.userId,
      metadata: {
        email: user.email,
      },
      createdAt: Date.now(),
    });
  },
});

const supportedCrypto = v.union(
  v.literal("BTC"),
  v.literal("ETH"),
  v.literal("SOL"),
  v.literal("LTC"),
  v.literal("BNB"),
  v.literal("ADA"),
  v.literal("XRP"),
  v.literal("DOGE"),
  v.literal("DOT"),
  v.literal("MATIC"),
  v.literal("AVAX"),
  v.literal("ATOM"),
  v.literal("LINK"),
  v.literal("UNI"),
  v.literal("USDT"),
  v.literal("USDC"),
);

export const adjustUserBalance = mutation({
  args: {
    adminId: v.id("users"),
    userId: v.id("users"),
    balanceType: v.union(v.literal("platform"), v.literal("mining")),
    crypto: supportedCrypto,
    direction: v.union(v.literal("add"), v.literal("subtract")),
    amountUSD: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amountUSD <= 0) {
      throw new ConvexError("Amount must be greater than zero");
    }

    const [admin, user] = await Promise.all([
      ctx.db.get(args.adminId),
      ctx.db.get(args.userId),
    ]);

    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Only administrators can adjust user balances");
    }
    if (!user) {
      throw new ConvexError("User not found");
    }

    const prices = await getPriceMap(ctx);
    const price = STABLECOINS.has(args.crypto) ? 1 : (prices[args.crypto] ?? 0);
    if (price <= 0) {
      throw new ConvexError(`Live price unavailable for ${args.crypto}`);
    }

    const cryptoDelta = args.amountUSD / price;
    const signedDelta = args.direction === "add" ? cryptoDelta : -cryptoDelta;

    const targetBalance = args.balanceType === "mining" ? user.miningBalance : user.platformBalance;
    const knownFields = args.balanceType === "mining" ? MINING_BALANCE_FIELDS : PLATFORM_BALANCE_FIELDS;

    const currentBalance = getBalanceAmount(targetBalance, args.crypto);
    const newBalance = currentBalance + signedDelta;

    if (newBalance < 0) {
      throw new ConvexError(
        `Insufficient balance. Current ${args.crypto}: ${currentBalance}. Cannot deduct ${Math.abs(signedDelta)}.`,
      );
    }

    const updatedBalance = setBalanceAmount(targetBalance, args.crypto, newBalance, knownFields);

    await ctx.db.patch(
      args.userId,
      args.balanceType === "mining"
        ? { miningBalance: updatedBalance as typeof user.miningBalance }
        : { platformBalance: updatedBalance as typeof user.platformBalance },
    );

    await ctx.db.insert("auditLogs", {
      actorId: args.adminId,
      action: "user:adjustBalance",
      entity: "user",
      entityId: args.userId,
      metadata: {
        email: user.email,
        balanceType: args.balanceType,
        crypto: args.crypto,
        direction: args.direction,
        amountUSD: args.amountUSD,
        cryptoDelta: signedDelta,
        previousBalance: currentBalance,
        newBalance,
        reason: args.reason ?? undefined,
      },
      createdAt: Date.now(),
    });

    return {
      success: true,
      previousBalance: currentBalance,
      newBalance,
    };
  },
});

