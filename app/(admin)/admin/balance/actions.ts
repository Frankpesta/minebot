"use server";

import { revalidatePath } from "next/cache";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getConvexClient } from "@/lib/convex/client";
import type { SupportedCrypto } from "@/lib/crypto/constants";

export async function adjustBalanceAction(params: {
  userId: string;
  balanceType: "platform" | "mining";
  crypto: SupportedCrypto;
  direction: "add" | "subtract";
  amountUSD: number;
  reason?: string;
}) {
  const current = await getCurrentUser();
  if (!current || current.user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  if (params.amountUSD <= 0) {
    return { success: false, error: "Amount must be greater than zero" };
  }
  const convex = getConvexClient();
  try {
    const result = await convex.mutation(api.usersAdmin.adjustUserBalance, {
      adminId: current.user._id,
      userId: params.userId as Id<"users">,
      balanceType: params.balanceType,
      crypto: params.crypto,
      direction: params.direction,
      amountUSD: params.amountUSD,
      reason: params.reason,
    });
    revalidatePath("/admin/balance");
    revalidatePath("/admin/users");
    return {
      success: true,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to adjust balance",
    };
  }
}
