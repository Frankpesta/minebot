/**
 * Supported mainstream cryptocurrencies for hot wallets
 * These match the coins supported in convex/prices.ts
 */
export const SUPPORTED_CRYPTO = [
  "BTC",
  "ETH",
  "SOL",
  "LTC",
  "BNB",
  "ADA",
  "XRP",
  "DOGE",
  "DOT",
  "MATIC",
  "AVAX",
  "ATOM",
  "LINK",
  "UNI",
  "USDT",
  "USDC",
] as const;

export type SupportedCrypto = (typeof SUPPORTED_CRYPTO)[number];

/**
 * Human-readable names for cryptocurrencies
 */
export const CRYPTO_NAMES: Record<SupportedCrypto, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  LTC: "Litecoin",
  BNB: "Binance Coin",
  ADA: "Cardano",
  XRP: "Ripple",
  DOGE: "Dogecoin",
  DOT: "Polkadot",
  MATIC: "Polygon",
  AVAX: "Avalanche",
  ATOM: "Cosmos",
  LINK: "Chainlink",
  UNI: "Uniswap",
  USDT: "Tether",
  USDC: "USD Coin",
};

/** Minimum deposit amounts per coin (for validation) */
export const MIN_DEPOSIT: Partial<Record<SupportedCrypto, number>> = {
  BTC: 0.0001,
  ETH: 0.01,
  SOL: 0.1,
  LTC: 0.01,
  BNB: 0.01,
  ADA: 1,
  XRP: 10,
  DOGE: 10,
  DOT: 0.1,
  MATIC: 1,
  AVAX: 0.1,
  ATOM: 0.1,
  LINK: 0.1,
  UNI: 0.1,
  USDT: 10,
  USDC: 10,
};

/** Minimum withdrawal amounts per coin */
export const MIN_WITHDRAWAL: Partial<Record<SupportedCrypto, number>> = {
  BTC: 0.0001,
  ETH: 0.01,
  SOL: 0.1,
  LTC: 0.01,
  BNB: 0.01,
  ADA: 1,
  XRP: 10,
  DOGE: 10,
  DOT: 0.1,
  MATIC: 1,
  AVAX: 0.1,
  ATOM: 0.1,
  LINK: 0.1,
  UNI: 0.1,
  USDT: 25,
  USDC: 25,
};

