import { getCurrentUser } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KycForm } from "@/components/dashboard/kyc-form";

export default async function VerificationPage() {
  const current = await getCurrentUser();
  if (!current) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Identity verification</h1>
        <p className="text-sm text-muted-foreground">
          Submit a government-issued ID to verify your identity and unlock full platform access.
        </p>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>KYC submission</CardTitle>
          <CardDescription>
            Choose your document type and upload clear photos of the front and back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KycForm userId={current.user._id} />
        </CardContent>
      </Card>
    </div>
  );
}
