import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const generateKycUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const submitKyc = mutation({
  args: {
    userId: v.id("users"),
    documentType: v.union(v.literal("national_id"), v.literal("drivers_license")),
    frontImageId: v.id("_storage"),
    backImageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }
    if (user.kycStatus === "pending") {
      throw new ConvexError("You already have a KYC submission under review");
    }
    if (user.kycStatus === "approved") {
      throw new ConvexError("Your identity is already verified");
    }

    const now = Date.now();
    await ctx.db.insert("kycSubmissions", {
      userId: args.userId,
      documentType: args.documentType,
      frontImageId: args.frontImageId,
      backImageId: args.backImageId,
      status: "pending",
      submittedAt: now,
    });

    await ctx.db.patch(args.userId, {
      kycStatus: "pending",
    });

    return { success: true };
  },
});

export const getMyKycStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const status = user.kycStatus ?? "none";
    const latest = await ctx.db
      .query("kycSubmissions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    return {
      kycStatus: status,
      latestSubmission: latest
        ? {
            _id: latest._id,
            documentType: latest.documentType,
            status: latest.status,
            submittedAt: latest.submittedAt,
            reviewedAt: latest.reviewedAt,
            rejectionReason: latest.rejectionReason,
          }
        : null,
    };
  },
});

export const getMyKycSubmissionWithUrls = query({
  args: { userId: v.id("users"), submissionId: v.id("kycSubmissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.userId !== args.userId) return null;
    const frontUrl = await ctx.storage.getUrl(submission.frontImageId);
    const backUrl = await ctx.storage.getUrl(submission.backImageId);
    return {
      ...submission,
      frontImageUrl: frontUrl,
      backImageUrl: backUrl,
    };
  },
});

export const listKycForAdmin = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const submissions = args.status
      ? await ctx.db
          .query("kycSubmissions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(limit)
      : await ctx.db.query("kycSubmissions").order("desc").take(limit);

    const withUserAndUrls = await Promise.all(
      submissions.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        const frontUrl = await ctx.storage.getUrl(s.frontImageId);
        const backUrl = await ctx.storage.getUrl(s.backImageId);
        return {
          ...s,
          userEmail: user?.email ?? null,
          frontImageUrl: frontUrl,
          backImageUrl: backUrl,
        };
      }),
    );
    return withUserAndUrls;
  },
});

export const getKycSubmissionForAdmin = query({
  args: { submissionId: v.id("kycSubmissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;
    const user = await ctx.db.get(submission.userId);
    const frontUrl = await ctx.storage.getUrl(submission.frontImageId);
    const backUrl = await ctx.storage.getUrl(submission.backImageId);
    return {
      ...submission,
      userEmail: user?.email ?? null,
      frontImageUrl: frontUrl,
      backImageUrl: backUrl,
    };
  },
});

export const approveKyc = mutation({
  args: {
    submissionId: v.id("kycSubmissions"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const [admin, submission] = await Promise.all([
      ctx.db.get(args.adminId),
      ctx.db.get(args.submissionId),
    ]);
    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Only administrators can approve KYC");
    }
    if (!submission) {
      throw new ConvexError("KYC submission not found");
    }
    if (submission.status !== "pending") {
      throw new ConvexError("This submission has already been reviewed");
    }

    const now = Date.now();
    await ctx.db.patch(args.submissionId, {
      status: "approved",
      reviewedAt: now,
      reviewedBy: args.adminId,
      rejectionReason: undefined,
    });

    await ctx.db.patch(submission.userId, {
      kycStatus: "approved",
    });

    await ctx.db.insert("notifications", {
      userId: submission.userId,
      type: "kyc_approved",
      title: "Identity verified",
      message: "Your KYC submission has been approved. You now have full access to the platform.",
      isRead: false,
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: args.adminId,
      action: "kyc:approve",
      entity: "kycSubmission",
      entityId: args.submissionId,
      metadata: { userId: submission.userId },
      createdAt: now,
    });

    return { success: true };
  },
});

export const rejectKyc = mutation({
  args: {
    submissionId: v.id("kycSubmissions"),
    adminId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [admin, submission] = await Promise.all([
      ctx.db.get(args.adminId),
      ctx.db.get(args.submissionId),
    ]);
    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Only administrators can reject KYC");
    }
    if (!submission) {
      throw new ConvexError("KYC submission not found");
    }
    if (submission.status !== "pending") {
      throw new ConvexError("This submission has already been reviewed");
    }

    const now = Date.now();
    await ctx.db.patch(args.submissionId, {
      status: "rejected",
      reviewedAt: now,
      reviewedBy: args.adminId,
      rejectionReason: args.reason ?? undefined,
    });

    await ctx.db.patch(submission.userId, {
      kycStatus: "rejected",
    });

    await ctx.db.insert("notifications", {
      userId: submission.userId,
      type: "kyc_rejected",
      title: "KYC not approved",
      message: args.reason
        ? `Your KYC submission was not approved: ${args.reason}. You may resubmit with correct documents.`
        : "Your KYC submission was not approved. You may resubmit with correct documents.",
      isRead: false,
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: args.adminId,
      action: "kyc:reject",
      entity: "kycSubmission",
      entityId: args.submissionId,
      metadata: { userId: submission.userId, reason: args.reason },
      createdAt: now,
    });

    return { success: true };
  },
});
