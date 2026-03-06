"use server";

import { revalidatePath } from "next/cache";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getConvexClient } from "@/lib/convex/client";

export async function approveKycAction(submissionId: string) {
  const current = await getCurrentUser();
  if (!current || current.user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  const convex = getConvexClient();
  try {
    await convex.mutation(api.kyc.approveKyc, {
      submissionId: submissionId as Id<"kycSubmissions">,
      adminId: current.user._id,
    });
    revalidatePath("/admin/kyc");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to approve",
    };
  }
}

export async function rejectKycAction(submissionId: string, reason?: string) {
  const current = await getCurrentUser();
  if (!current || current.user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  const convex = getConvexClient();
  try {
    await convex.mutation(api.kyc.rejectKyc, {
      submissionId: submissionId as Id<"kycSubmissions">,
      adminId: current.user._id,
      reason: reason || undefined,
    });
    revalidatePath("/admin/kyc");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reject",
    };
  }
}
