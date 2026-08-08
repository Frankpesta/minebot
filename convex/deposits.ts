import { ConvexError, v } from "convex/values";

import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const depositCryptoUnion = v.union(
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

export const createDepositRequest = mutation({
  args: {
    userId: v.id("users"),
    crypto: depositCryptoUnion,
    amount: v.number(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError("Deposit amount must be greater than zero");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const hotWallet = await ctx.db
      .query("hotWallets")
      .withIndex("by_crypto", (q) => q.eq("crypto", args.crypto))
      .first();

    if (!hotWallet) {
      throw new ConvexError(`No deposit wallet configured for ${args.crypto}`);
    }

    return ctx.db.insert("deposits", {
      userId: args.userId,
      crypto: args.crypto,
      amount: args.amount,
      txHash: args.txHash,
      walletAddress: hotWallet.address,
      status: "pending",
      adminNote: undefined,
      approvedBy: undefined,
      createdAt: Date.now(),
      approvedAt: undefined,
    });
  },
});

export const listUserDeposits = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return ctx.db
      .query("deposits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

export const listAdminDeposits = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const deposits = await ctx.db
      .query("deposits")
      .order("desc")
      .take(limit);

    const filtered = args.status
      ? deposits.filter((deposit) => deposit.status === args.status)
      : deposits;

    return withUserEmail(ctx, filtered);
  },
});

/**
 * Internal mutation to update deposit status (called by action)
 */
export const updateDepositStatusInternal = internalMutation({
  args: {
    depositId: v.id("deposits"),
    adminId: v.id("users"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    adminNote: v.optional(v.string()),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const deposit = await ctx.db.get(args.depositId);
    if (!deposit) {
      throw new ConvexError("Deposit not found");
    }

    const user = await ctx.db.get(deposit.userId);
    if (!user) {
      throw new ConvexError("Associated user not found");
    }

    if (args.status === "approved") {
      const existing = (user.platformBalance as Record<string, unknown>)[deposit.crypto];
      const current = typeof existing === "number" ? existing : 0;
      await ctx.db.patch(user._id, {
        platformBalance: {
          ...user.platformBalance,
          [deposit.crypto]: current + (deposit.amount ?? 0),
        },
      });
    }

    await ctx.db.patch(args.depositId, {
      status: args.status,
      adminNote: args.adminNote,
      approvedBy: args.adminId,
      approvedAt: args.status === "approved" ? Date.now() : undefined,
      txHash: args.txHash ?? deposit.txHash,
    });

    await ctx.db.insert("auditLogs", {
      actorId: args.adminId,
      action: "deposit:update",
      entity: "deposit",
      entityId: args.depositId,
      metadata: {
        newStatus: args.status,
        amount: deposit.amount,
        crypto: deposit.crypto,
        userId: deposit.userId,
      },
      createdAt: Date.now(),
    });
  },
});

/**
 * Action to approve or reject a deposit. Approval credits the user's
 * platform balance only — investing it into a plan is a separate, manual
 * step the user takes afterward.
 */
export const updateDepositStatus = action({
  args: {
    depositId: v.id("deposits"),
    adminId: v.id("users"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    adminNote: v.optional(v.string()),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [admin, deposit] = await Promise.all([
      ctx.runQuery(internal.deposits.getUserById, { userId: args.adminId }),
      ctx.runQuery(internal.deposits.getDepositById, { depositId: args.depositId }),
    ]);

    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Only administrators can update deposits");
    }

    if (!deposit) {
      throw new ConvexError("Deposit not found");
    }

    if (deposit.status !== "pending") {
      throw new ConvexError("Deposit has already been processed");
    }

    // Update deposit status. Approval credits the user's platform balance;
    // investing that balance into a plan is now a separate, manual step the
    // user takes from the mining packages page.
    await ctx.runMutation(internal.deposits.updateDepositStatusInternal, {
      depositId: args.depositId,
      adminId: args.adminId,
      status: args.status,
      adminNote: args.adminNote,
      txHash: args.txHash,
    });
  },
});

/**
 * Helper query to get user by ID (for internal use)
 */
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

/**
 * Helper query to get deposit by ID (for internal use)
 */
export const getDepositById = internalQuery({
  args: { depositId: v.id("deposits") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.depositId);
  },
});

async function withUserEmail(
  ctx: QueryCtx,
  deposits: Array<Doc<"deposits">>,
): Promise<Array<Doc<"deposits"> & { userEmail: string | null }>> {
  const uniqueUserIds = Array.from(new Set(deposits.map((deposit) => deposit.userId)));
  const users = await Promise.all(uniqueUserIds.map((userId) => ctx.db.get(userId)));
  const emailMap = new Map<Id<"users">, string>();

  users.forEach((user) => {
    if (user) {
      emailMap.set(user._id, user.email);
    }
  });

  return deposits.map((deposit) => ({
    ...deposit,
    userEmail: emailMap.get(deposit.userId) ?? null,
  }));
}

