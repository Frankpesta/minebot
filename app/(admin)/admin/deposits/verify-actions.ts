"use server";

import { verifyDepositTransaction } from "@/lib/blockchain/admin-helpers";
import type { SupportedCrypto } from "@/lib/crypto/constants";

export async function verifyDepositTx(
  txHash: string,
  walletAddress: string,
  amount: number,
  crypto: SupportedCrypto,
) {
  try {
    // Only ETH, USDT, USDC are on Ethereum and can be verified on-chain
    if (crypto !== "ETH" && crypto !== "USDT" && crypto !== "USDC") {
      return {
        isValid: false,
        confirmed: false,
        error: `${crypto} transaction verification is not yet supported. Please verify manually.`,
      };
    }
    const result = await verifyDepositTransaction(txHash, walletAddress, amount, crypto);
    return result;
  } catch (error) {
    return {
      isValid: false,
      confirmed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

