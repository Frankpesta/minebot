"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { approveKycAction, rejectKycAction } from "@/app/(admin)/admin/kyc/actions";
import { formatDate } from "@/lib/utils";

const DOCUMENT_LABELS: Record<string, string> = {
  national_id: "National ID",
  drivers_license: "Driver's License",
};

type Submission = {
  _id: string;
  userId: string;
  userEmail: string | null;
  documentType: string;
  status: string;
  submittedAt: number;
  reviewedAt?: number;
  rejectionReason?: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
};

export function KycReviewCard({ submission }: { submission: Submission }) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveKycAction(submission._id);
      if (result.success) {
        toast.success("KYC approved");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectKycAction(submission._id, reason || undefined);
      if (result.success) {
        toast.success("KYC rejected");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (submission.status !== "pending") {
    return (
      <article className="rounded-lg border border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{submission.userEmail ?? "Unknown"}</p>
            <p className="text-xs text-muted-foreground">
              {DOCUMENT_LABELS[submission.documentType] ?? submission.documentType} •{" "}
              {formatDate(submission.submittedAt)}
            </p>
          </div>
          <span
            className={
              submission.status === "approved"
                ? "text-green-600 dark:text-green-400"
                : "text-destructive"
            }
          >
            {submission.status}
          </span>
        </div>
        {submission.rejectionReason && (
          <p className="mt-2 text-sm text-muted-foreground">Reason: {submission.rejectionReason}</p>
        )}
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-border/60 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{submission.userEmail ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">
            {DOCUMENT_LABELS[submission.documentType] ?? submission.documentType} •{" "}
            {formatDate(submission.submittedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Front</p>
          {submission.frontImageUrl ? (
            <a
              href={submission.frontImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative aspect-[4/3] rounded-md border bg-muted overflow-hidden"
            >
              <Image
                src={submission.frontImageUrl}
                alt="Front of document"
                fill
                className="object-contain"
                unoptimized
              />
            </a>
          ) : (
            <div className="aspect-[4/3] rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Back</p>
          {submission.backImageUrl ? (
            <a
              href={submission.backImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative aspect-[4/3] rounded-md border bg-muted overflow-hidden"
            >
              <Image
                src={submission.backImageUrl}
                alt="Back of document"
                fill
                className="object-contain"
                unoptimized
              />
            </a>
          ) : (
            <div className="aspect-[4/3] rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`reason-${submission._id}`}>Rejection reason (optional)</Label>
        <Input
          id={`reason-${submission._id}`}
          placeholder="e.g. Document expired, image unclear"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleApprove} disabled={isPending}>
          Approve
        </Button>
        <Button variant="destructive" onClick={handleReject} disabled={isPending}>
          Reject
        </Button>
      </div>
    </article>
  );
}
