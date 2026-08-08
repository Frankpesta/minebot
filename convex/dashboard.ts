import { ConvexError, v } from "convex/values";
import type { FunctionReturnType } from "convex/server";

import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { api } from "./_generated/api";
import { getPriceMap } from "./prices";
import { calculateBalanceUSD } from "../lib/crypto/valuation";

export const getUserDashboardSummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const prices = await getPriceMap(ctx);

    const miningOperations = await ctx.db
      .query("miningOperations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const activeOperations = miningOperations.filter((operation) => operation.status === "active");
    const totalActiveHashrate = activeOperations.reduce(
      (accumulator, operation) => accumulator + operation.hashRate,
      0,
    );

    const recentDeposits = await ctx.db
      .query("deposits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    const recentWithdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    const pendingWithdrawals = recentWithdrawals.filter(
      (withdrawal) => withdrawal.status === "pending",
    ).length;

    const totalPlatformBalance = calculateBalanceUSD(user.platformBalance, prices);
    const totalMiningBalance = calculateBalanceUSD(user.miningBalance, prices);

    // Get referral stats
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
      .collect();
    
    const totalReferrals = referrals.length;
    const awardedReferrals = referrals.filter((r) => r.status === "awarded").length;
    const totalBonusEarned = referrals
      .filter((r) => r.status === "awarded")
      .reduce((sum, r) => sum + r.bonusAmount, 0);

    return {
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
      },
      metrics: {
        platformBalance: totalPlatformBalance,
        miningBalance: totalMiningBalance,
        activeOperations: activeOperations.length,
        totalActiveHashrate,
        pendingWithdrawals,
      },
      balances: {
        platform: user.platformBalance,
        mining: user.miningBalance,
      },
      prices,
      referral: {
        referralCode: user.referralCode || "",
        totalReferrals,
        awardedReferrals,
        totalBonusEarned,
        referralBonusEarned: user.referralBonusEarned || 0,
      },
      recentDeposits,
      recentWithdrawals,
    };
  },
});

export const getAdminDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const miningOperations = await ctx.db.query("miningOperations").collect();
    const deposits = await ctx.db.query("deposits").collect();
    const withdrawals = await ctx.db.query("withdrawals").collect();
    const referrals = await ctx.db.query("referrals").collect();
    const prices = await getPriceMap(ctx);

    const totalPlatformBalance = users.reduce(
      (accumulator, user) => accumulator + calculateBalanceUSD(user.platformBalance, prices),
      0,
    );

    const totalMiningBalance = users.reduce(
      (accumulator, user) => accumulator + calculateBalanceUSD(user.miningBalance, prices),
      0,
    );

    const pendingDeposits = deposits.filter((deposit) => deposit.status === "pending");
    const pendingWithdrawals = withdrawals.filter(
      (withdrawal) => withdrawal.status === "pending",
    );
    const activeOperations = miningOperations.filter(
      (operation) => operation.status === "active",
    );

    const userEmailById = new Map(users.map((user) => [user._id, user.email]));

    const recentDeposits = deposits
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((deposit) => ({
        ...deposit,
        userEmail: userEmailById.get(deposit.userId as Id<"users">) ?? null,
      }));
    const recentWithdrawals = withdrawals
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((withdrawal) => ({
        ...withdrawal,
        userEmail: userEmailById.get(withdrawal.userId as Id<"users">) ?? null,
      }));

    // Calculate user growth over time (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const userGrowth = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dateEnd = dateStart + 24 * 60 * 60 * 1000;
      const count = users.filter(
        (u) => u.createdAt >= dateStart && u.createdAt < dateEnd,
      ).length;
      userGrowth.push({
        date: new Date(dateStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        users: count,
      });
    }

    // Calculate deposit/withdrawal trends
    const depositTrends = [];
    const withdrawalTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dateEnd = dateStart + 24 * 60 * 60 * 1000;
      const depositAmount = deposits
        .filter((d) => d.createdAt >= dateStart && d.createdAt < dateEnd && d.status === "approved")
        .reduce((sum, d) => sum + calculateBalanceUSD({ [d.crypto]: d.amount }, prices), 0);
      const withdrawalAmount = withdrawals
        .filter((w) => w.createdAt >= dateStart && w.createdAt < dateEnd && w.status === "completed")
        .reduce((sum, w) => sum + calculateBalanceUSD({ [w.crypto]: w.amount }, prices), 0);
      const dateLabel = new Date(dateStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      depositTrends.push({ date: dateLabel, amount: depositAmount });
      withdrawalTrends.push({ date: dateLabel, amount: withdrawalAmount });
    }

    // Calculate referral stats
    const totalReferrals = referrals.length;
    const awardedReferrals = referrals.filter((r) => r.status === "awarded").length;
    const totalReferralBonus = referrals
      .filter((r) => r.status === "awarded")
      .reduce((sum, r) => sum + r.bonusAmount, 0);

    return {
      metrics: {
        totalUsers: users.length,
        totalPlatformBalance,
        totalMiningBalance,
        pendingDeposits: pendingDeposits.length,
        pendingWithdrawals: pendingWithdrawals.length,
        activeOperations: activeOperations.length,
        totalReferrals,
        awardedReferrals,
        totalReferralBonus,
      },
      recentDeposits,
      recentWithdrawals,
      charts: {
        userGrowth,
        depositTrends,
        withdrawalTrends,
      },
    };
  },
});

export type UserDashboardSummary = FunctionReturnType<
  typeof api.dashboard.getUserDashboardSummary
>;

export type AdminDashboardSummary = FunctionReturnType<
  typeof api.dashboard.getAdminDashboardSummary
>;

export type DashboardUserId = Id<"users">;

