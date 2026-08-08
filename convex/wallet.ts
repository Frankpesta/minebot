import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get platform balance for a user
 * USD calculation uses the cached price table (see convex/prices.ts)
 */
export const getPlatformBalance = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return user.platformBalance;
  },
});

/**
 * Get mining balance for a user
 * USD calculation uses the cached price table (see convex/prices.ts)
 */
export const getMiningBalance = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return user.miningBalance;
  },
});

