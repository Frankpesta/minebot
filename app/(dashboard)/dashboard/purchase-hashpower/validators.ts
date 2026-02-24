import { z } from "zod";
import { SUPPORTED_CRYPTO } from "@/lib/crypto/constants";

export const depositRequestSchema = z.object({
  crypto: z.enum(SUPPORTED_CRYPTO as unknown as [string, ...string[]]),
  amount: z.coerce
    .number("Enter a numeric amount")
    .positive("Amount must be greater than zero"),
  txHash: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type DepositRequestInput = z.input<typeof depositRequestSchema>;
export type DepositRequestValues = z.infer<typeof depositRequestSchema>;

