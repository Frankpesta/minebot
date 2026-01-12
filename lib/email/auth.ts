import { render } from "@react-email/render";
import { getAppBaseUrl } from "@/lib/env";
import { getResendClient } from "./client";
import { VerificationEmail } from "@/emails/verification-email";
import { PasswordResetEmail } from "@/emails/password-reset-email";

const DEFAULT_FROM_EMAIL = "Novaxblockpool <notifications@notifications.novaxblockpool.com>";

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;
}

export async function sendVerificationEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const client = getResendClient();
  const url = `${getAppBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (!client) {
    console.info(
      `[email] Verification email skipped for ${email}. Configure RESEND_API_KEY to enable delivery.`,
    );
    console.info(`Verification link: ${url}`);
    return;
  }

  try {
    const emailHtml = await render(
      VerificationEmail({
        verificationUrl: url,
      }),
    );

    const result = await client.emails.send({
      from: getFromEmail(),
      to: email,
      subject: "Confirm your email address - Novaxblockpool",
      html: emailHtml,
    });

    if (result.error) {
      console.error("[email] Failed to send verification email:", result.error);
      // Don't throw - log error but don't break the application
      return;
    }

    console.info(`[email] Verification email sent successfully to ${email}`, result.data?.id ? `(ID: ${result.data.id})` : "");
  } catch (error) {
    console.error("[email] Error sending verification email:", error);
    // Don't throw - log error but don't break the application
  }
}

export async function sendPasswordResetEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const client = getResendClient();
  const url = `${getAppBaseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;

  if (!client) {
    console.info(
      `[email] Password reset email skipped for ${email}. Configure RESEND_API_KEY to enable delivery.`,
    );
    console.info(`Reset link: ${url}`);
    return;
  }

  try {
    const emailHtml = await render(
      PasswordResetEmail({
        resetUrl: url,
      }),
    );

    const result = await client.emails.send({
      from: getFromEmail(),
      to: email,
      subject: "Reset your password - Novaxblockpool",
      html: emailHtml,
    });

    if (result.error) {
      console.error("[email] Failed to send password reset email:", result.error);
      // Don't throw - log error but don't break the application
      return;
    }

    console.info(`[email] Password reset email sent successfully to ${email}`, result.data?.id ? `(ID: ${result.data.id})` : "");
  } catch (error) {
    console.error("[email] Error sending password reset email:", error);
    // Don't throw - log error but don't break the application
  }
}

