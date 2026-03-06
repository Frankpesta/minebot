"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Upload, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const DOCUMENT_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "drivers_license", label: "Driver's License" },
] as const;

type Props = {
  userId: Id<"users">;
};

export function KycForm({ userId }: Props) {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<"national_id" | "drivers_license">("national_id");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const status = useQuery(api.kyc.getMyKycStatus, { userId });
  const generateUploadUrl = useMutation(api.kyc.generateKycUploadUrl);
  const submitKyc = useMutation(api.kyc.submitKyc);

  const kycStatus = status?.kycStatus ?? "none";
  const latest = status?.latestSubmission;

  const handleUploadFile = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!result.ok) {
      throw new Error("Upload failed");
    }
    const text = await result.text();
    let storageId: string;
    try {
      const json = JSON.parse(text);
      storageId = json.storageId ?? text;
    } catch {
      storageId = text.trim();
    }
    return storageId as Id<"_storage">;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontFile || !backFile) {
      toast.error("Please upload both front and back images");
      return;
    }
    if (frontFile.size > 10 * 1024 * 1024 || backFile.size > 10 * 1024 * 1024) {
      toast.error("Each image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const [frontId, backId] = await Promise.all([
        handleUploadFile(frontFile),
        handleUploadFile(backFile),
      ]);
      await submitKyc({
        userId,
        documentType,
        frontImageId: frontId,
        backImageId: backId,
      });
      toast.success("KYC submitted successfully. We'll review it shortly.");
      router.refresh();
      setFrontFile(null);
      setBackFile(null);
      if (frontInputRef.current) frontInputRef.current.value = "";
      if (backInputRef.current) backInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setUploading(false);
    }
  };

  if (kycStatus === "approved") {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">Identity verified</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              You have full access to all platform features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus === "pending") {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Verification under review</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your documents are being reviewed. We'll notify you once the review is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {kycStatus === "rejected" && latest?.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Previous submission was not approved</p>
          <p className="mt-1">{latest.rejectionReason}</p>
          <p className="mt-2 text-muted-foreground">You may resubmit with correct documents below.</p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        To access withdrawals and full platform features, please verify your identity by submitting a valid ID document.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>Document type</Label>
          <Select
            value={documentType}
            onValueChange={(v) => setDocumentType(v as "national_id" | "drivers_license")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Front of document</Label>
            <div className="flex flex-col gap-2">
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*,.pdf"
                className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
              />
              {frontFile && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-3 w-3" />
                  {frontFile.name}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Back of document</Label>
            <div className="flex flex-col gap-2">
              <input
                ref={backInputRef}
                type="file"
                accept="image/*,.pdf"
                className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
              />
              {backFile && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-3 w-3" />
                  {backFile.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Accepted: images (JPG, PNG) or PDF. Max 10MB per file. Ensure the document is clearly visible and not expired.
        </p>

        <Button type="submit" disabled={uploading || !frontFile || !backFile}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit for verification"
          )}
        </Button>
      </form>
    </div>
  );
}
