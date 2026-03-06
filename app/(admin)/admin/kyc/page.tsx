import { getConvexClient } from "@/lib/convex/client";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KycReviewCard } from "@/components/admin/kyc-review-card";

export default async function AdminKycPage() {
  const convex = getConvexClient();
  const [pending, recent] = await Promise.all([
    convex.query(api.kyc.listKycForAdmin, { status: "pending", limit: 50 }),
    convex.query(api.kyc.listKycForAdmin, { limit: 30 }),
  ]);

  const history = recent.filter((s) => s.status !== "pending").slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">KYC verification</h1>
        <p className="text-sm text-muted-foreground">
          Review identity documents and approve or reject submissions.
        </p>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle>Pending review</CardTitle>
          <CardDescription>
            Approve or reject KYC submissions. Users need approval to access withdrawals and full platform features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending KYC submissions.</p>
          ) : (
            pending.map((submission) => (
              <KycReviewCard
                key={submission._id}
                submission={{
                  _id: submission._id,
                  userId: submission.userId,
                  userEmail: submission.userEmail,
                  documentType: submission.documentType,
                  status: submission.status,
                  submittedAt: submission.submittedAt,
                  reviewedAt: submission.reviewedAt,
                  rejectionReason: submission.rejectionReason,
                  frontImageUrl: submission.frontImageUrl,
                  backImageUrl: submission.backImageUrl,
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle>Recent decisions</CardTitle>
          <CardDescription>History of approved and rejected KYC submissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent decisions.</p>
          ) : (
            history.map((submission) => (
              <KycReviewCard
                key={submission._id}
                submission={{
                  _id: submission._id,
                  userId: submission.userId,
                  userEmail: submission.userEmail,
                  documentType: submission.documentType,
                  status: submission.status,
                  submittedAt: submission.submittedAt,
                  reviewedAt: submission.reviewedAt,
                  rejectionReason: submission.rejectionReason,
                  frontImageUrl: submission.frontImageUrl,
                  backImageUrl: submission.backImageUrl,
                }}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
