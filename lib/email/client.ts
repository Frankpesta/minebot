import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY is not set. Emails will not be delivered until this environment variable is configured.",
    );
    const resendEnvVars = Object.keys(process.env).filter(key => key.includes('RESEND'));
    if (resendEnvVars.length > 0) {
      console.warn("Found RESEND-related env vars:", resendEnvVars);
    } else {
      console.warn("No RESEND-related environment variables found.");
    }
    return null;
  }

  // Log that API key is found (but don't log the actual key)
  if (!resendClient) {
    console.info("[email] Resend client initialized successfully");
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

